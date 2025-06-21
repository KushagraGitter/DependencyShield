import axios from 'axios';
import { parse } from 'node-html-parser';
import * as semver from 'semver';

export interface ChangelogEntry {
  version: string;
  date?: string;
  changes: {
    type: 'breaking' | 'feature' | 'fix' | 'security' | 'deprecation';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }[];
  migrationNotes?: string[];
}

export interface BreakingChangeAnalysis {
  hasBreakingChanges: boolean;
  breakingChanges: {
    version: string;
    changes: string[];
    migrationPath: string[];
    automationPossible: boolean;
  }[];
  migrationComplexity: 'low' | 'medium' | 'high';
  estimatedEffort: string;
}

export async function analyzeChangelog(
  packageName: string,
  fromVersion: string,
  toVersion: string
): Promise<BreakingChangeAnalysis> {
  try {
    const changelog = await fetchChangelog(packageName);
    const relevantVersions = getVersionsBetween(changelog, fromVersion, toVersion);
    
    const breakingChanges = relevantVersions.filter(entry => 
      entry.changes.some(change => change.type === 'breaking')
    ).map(entry => ({
      version: entry.version,
      changes: entry.changes
        .filter(change => change.type === 'breaking')
        .map(change => change.description),
      migrationPath: entry.migrationNotes || [],
      automationPossible: assessAutomationPossibility(entry.changes),
    }));

    const hasBreakingChanges = breakingChanges.length > 0;
    const migrationComplexity = calculateMigrationComplexity(breakingChanges);
    const estimatedEffort = estimateEffort(breakingChanges, migrationComplexity);

    return {
      hasBreakingChanges,
      breakingChanges,
      migrationComplexity,
      estimatedEffort,
    };
  } catch (error) {
    console.error(`Failed to analyze changelog for ${packageName}:`, error);
    return {
      hasBreakingChanges: false,
      breakingChanges: [],
      migrationComplexity: 'low',
      estimatedEffort: 'Unknown - unable to fetch changelog',
    };
  }
}

async function fetchChangelog(packageName: string): Promise<ChangelogEntry[]> {
  const sources = [
    `https://raw.githubusercontent.com/${await getGitHubRepo(packageName)}/main/CHANGELOG.md`,
    `https://raw.githubusercontent.com/${await getGitHubRepo(packageName)}/master/CHANGELOG.md`,
    `https://raw.githubusercontent.com/${await getGitHubRepo(packageName)}/main/HISTORY.md`,
    `https://api.github.com/repos/${await getGitHubRepo(packageName)}/releases`,
  ];

  for (const source of sources) {
    try {
      const changelog = await fetchFromSource(source);
      if (changelog.length > 0) return changelog;
    } catch (error) {
      continue;
    }
  }

  // Fallback to npm registry information
  return await fetchNpmReleaseInfo(packageName);
}

async function getGitHubRepo(packageName: string): Promise<string> {
  try {
    const response = await axios.get(`https://registry.npmjs.org/${packageName}`);
    const repository = response.data.repository;
    
    if (repository && repository.url) {
      const match = repository.url.match(/github\.com[/:]([\w-]+\/[\w-]+)/);
      return match ? match[1] : `${packageName}/${packageName}`;
    }
  } catch (error) {
    // Fallback to package name
  }
  
  return `${packageName}/${packageName}`;
}

async function fetchFromSource(url: string): Promise<ChangelogEntry[]> {
  const response = await axios.get(url, { timeout: 10000 });
  
  if (url.includes('api.github.com')) {
    return parseGitHubReleases(response.data);
  } else {
    return parseMarkdownChangelog(response.data);
  }
}

function parseGitHubReleases(releases: any[]): ChangelogEntry[] {
  return releases.map(release => ({
    version: release.tag_name.replace(/^v/, ''),
    date: release.published_at,
    changes: parseReleaseBody(release.body || ''),
    migrationNotes: extractMigrationNotes(release.body || ''),
  }));
}

function parseMarkdownChangelog(content: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  const lines = content.split('\n');
  let currentEntry: ChangelogEntry | null = null;

  for (const line of lines) {
    // Version header detection
    const versionMatch = line.match(/^#{1,3}\s*\[?v?(\d+\.\d+\.\d+[^\]]*)\]?\s*(?:\(([^)]+)\))?/);
    if (versionMatch) {
      if (currentEntry) entries.push(currentEntry);
      currentEntry = {
        version: versionMatch[1],
        date: versionMatch[2],
        changes: [],
        migrationNotes: [],
      };
      continue;
    }

    if (currentEntry) {
      const change = parseChangelogLine(line);
      if (change) {
        currentEntry.changes.push(change);
      }

      if (line.toLowerCase().includes('migration') || line.toLowerCase().includes('breaking')) {
        currentEntry.migrationNotes?.push(line.trim());
      }
    }
  }

  if (currentEntry) entries.push(currentEntry);
  return entries;
}

function parseChangelogLine(line: string): { type: any; description: string; severity: any } | null {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith('-') && !trimmed.startsWith('*')) return null;

  const content = trimmed.substring(1).trim();
  
  const type = detectChangeType(content);
  const severity = detectSeverity(content);

  return {
    type,
    description: content,
    severity,
  };
}

function detectChangeType(content: string): 'breaking' | 'feature' | 'fix' | 'security' | 'deprecation' {
  const lower = content.toLowerCase();
  
  if (lower.includes('breaking') || lower.includes('removed') || lower.includes('deprecated')) {
    return 'breaking';
  }
  if (lower.includes('security') || lower.includes('vulnerability') || lower.includes('cve')) {
    return 'security';
  }
  if (lower.includes('deprecat')) {
    return 'deprecation';
  }
  if (lower.includes('fix') || lower.includes('bug')) {
    return 'fix';
  }
  
  return 'feature';
}

function detectSeverity(content: string): 'low' | 'medium' | 'high' | 'critical' {
  const lower = content.toLowerCase();
  
  if (lower.includes('critical') || lower.includes('major')) return 'critical';
  if (lower.includes('breaking') || lower.includes('security')) return 'high';
  if (lower.includes('important') || lower.includes('significant')) return 'medium';
  
  return 'low';
}

function parseReleaseBody(body: string): any[] {
  const changes = [];
  const lines = body.split('\n');
  
  for (const line of lines) {
    const change = parseChangelogLine(line);
    if (change) changes.push(change);
  }
  
  return changes;
}

function extractMigrationNotes(body: string): string[] {
  const notes = [];
  const lines = body.split('\n');
  
  for (const line of lines) {
    if (line.toLowerCase().includes('migration') || 
        line.toLowerCase().includes('upgrade') ||
        line.toLowerCase().includes('breaking')) {
      notes.push(line.trim());
    }
  }
  
  return notes;
}

async function fetchNpmReleaseInfo(packageName: string): Promise<ChangelogEntry[]> {
  try {
    const response = await axios.get(`https://registry.npmjs.org/${packageName}`);
    const versions = Object.keys(response.data.versions || {});
    
    return versions.map(version => ({
      version,
      date: response.data.time?.[version],
      changes: [],
      migrationNotes: [],
    }));
  } catch (error) {
    return [];
  }
}

function getVersionsBetween(
  changelog: ChangelogEntry[], 
  fromVersion: string, 
  toVersion: string
): ChangelogEntry[] {
  return changelog.filter(entry => {
    try {
      const version = semver.valid(semver.coerce(entry.version));
      const from = semver.valid(semver.coerce(fromVersion));
      const to = semver.valid(semver.coerce(toVersion));
      
      if (!version || !from || !to) return false;
      
      return semver.gt(version, from) && semver.lte(version, to);
    } catch (error) {
      return false;
    }
  });
}

function assessAutomationPossibility(changes: any[]): boolean {
  const automatable = changes.filter(change => {
    const desc = change.description.toLowerCase();
    return desc.includes('rename') || 
           desc.includes('moved') || 
           desc.includes('import') ||
           desc.includes('method signature');
  });
  
  return automatable.length > 0;
}

function calculateMigrationComplexity(breakingChanges: any[]): 'low' | 'medium' | 'high' {
  if (breakingChanges.length === 0) return 'low';
  if (breakingChanges.length <= 2) return 'medium';
  return 'high';
}

function estimateEffort(breakingChanges: any[], complexity: string): string {
  if (breakingChanges.length === 0) return '< 30 minutes';
  
  switch (complexity) {
    case 'low': return '30 minutes - 1 hour';
    case 'medium': return '1 - 4 hours';
    case 'high': return '4+ hours';
    default: return 'Unknown';
  }
}