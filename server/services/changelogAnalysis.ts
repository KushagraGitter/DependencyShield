import axios from 'axios';
import { parse } from 'node-html-parser';
import * as semver from 'semver';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ReleaseNotesComparison {
  packageName: string;
  currentVersion: string;
  recommendedVersion: string;
  summary: string;
  breakingChanges: {
    type: 'api' | 'config' | 'dependency' | 'behavior';
    description: string;
    impact: 'low' | 'medium' | 'high';
    migrationRequired: boolean;
  }[];
  newFeatures: string[];
  bugFixes: string[];
  securityFixes: string[];
  deprecations: string[];
  migrationComplexity: 'low' | 'medium' | 'high';
  estimatedMigrationTime: string;
  recommendations: string[];
}

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

export async function compareReleaseNotes(
  packageName: string,
  currentVersion: string,
  recommendedVersion: string
): Promise<ReleaseNotesComparison> {
  try {
    // Fetch release notes for both versions
    const currentReleaseNotes = await fetchReleaseNotesForVersion(packageName, currentVersion);
    const recommendedReleaseNotes = await fetchReleaseNotesForVersion(packageName, recommendedVersion);
    
    // Get all versions between current and recommended
    const versionsBetween = await getVersionChangesBetween(packageName, currentVersion, recommendedVersion);
    
    // Use AI to analyze the differences
    const analysisPrompt = `
Analyze the release notes comparison for ${packageName} from version ${currentVersion} to ${recommendedVersion}.

Current Version Release Notes:
${currentReleaseNotes || 'No release notes available'}

Recommended Version Release Notes:
${recommendedReleaseNotes || 'No release notes available'}

All Changes Between Versions:
${versionsBetween.join('\n\n')}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "summary": "Brief overview of major changes",
  "breakingChanges": [
    {
      "type": "api|config|dependency|behavior",
      "description": "Description of the breaking change",
      "impact": "low|medium|high",
      "migrationRequired": true|false
    }
  ],
  "newFeatures": ["List of new features added"],
  "bugFixes": ["List of important bug fixes"],
  "securityFixes": ["List of security vulnerabilities fixed"],
  "deprecations": ["List of deprecated features"],
  "migrationComplexity": "low|medium|high",
  "estimatedMigrationTime": "X hours/days/weeks",
  "recommendations": ["List of migration recommendations"]
}

Focus on:
1. Breaking changes that require code modifications
2. API changes that affect existing usage
3. Configuration changes needed
4. Security improvements and vulnerability fixes
5. New features that might be beneficial to adopt
6. Deprecated features that should be updated`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert software engineer specializing in package migration analysis. Provide detailed, accurate analysis of release notes and breaking changes. Always respond with valid JSON."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      packageName,
      currentVersion,
      recommendedVersion,
      summary: analysis.summary || 'No summary available',
      breakingChanges: analysis.breakingChanges || [],
      newFeatures: analysis.newFeatures || [],
      bugFixes: analysis.bugFixes || [],
      securityFixes: analysis.securityFixes || [],
      deprecations: analysis.deprecations || [],
      migrationComplexity: analysis.migrationComplexity || 'medium',
      estimatedMigrationTime: analysis.estimatedMigrationTime || '1-2 days',
      recommendations: analysis.recommendations || []
    };
    
  } catch (error) {
    console.error(`Error comparing release notes for ${packageName}:`, error);
    return {
      packageName,
      currentVersion,
      recommendedVersion,
      summary: 'Unable to analyze release notes',
      breakingChanges: [],
      newFeatures: [],
      bugFixes: [],
      securityFixes: [],
      deprecations: [],
      migrationComplexity: 'medium',
      estimatedMigrationTime: '1-2 days',
      recommendations: ['Manual review of changelog recommended']
    };
  }
}

async function fetchReleaseNotesForVersion(packageName: string, version: string): Promise<string> {
  try {
    // Try to get release notes from GitHub
    const repoUrl = await getGitHubRepo(packageName);
    if (repoUrl) {
      const response = await fetch(`https://api.github.com/repos/${repoUrl}/releases/tags/v${version}`);
      if (response.ok) {
        const release = await response.json();
        return release.body || '';
      }
    }
    
    // Fallback to npm registry
    const npmResponse = await fetch(`https://registry.npmjs.org/${packageName}/${version}`);
    if (npmResponse.ok) {
      const packageData = await npmResponse.json();
      return packageData.description || '';
    }
    
    return '';
  } catch (error) {
    console.error(`Error fetching release notes for ${packageName}@${version}:`, error);
    return '';
  }
}

async function getVersionChangesBetween(packageName: string, fromVersion: string, toVersion: string): Promise<string[]> {
  try {
    const repoUrl = await getGitHubRepo(packageName);
    if (!repoUrl) return [];
    
    // Get all releases between versions
    const response = await fetch(`https://api.github.com/repos/${repoUrl}/releases?per_page=100`);
    if (!response.ok) return [];
    
    const releases = await response.json();
    const changes: string[] = [];
    
    for (const release of releases) {
      const version = release.tag_name?.replace(/^v/, '');
      if (version && isVersionBetween(version, fromVersion, toVersion)) {
        changes.push(`Version ${version}:\n${release.body || 'No release notes'}`);
      }
    }
    
    return changes;
  } catch (error) {
    console.error(`Error fetching version changes for ${packageName}:`, error);
    return [];
  }
}

function isVersionBetween(version: string, from: string, to: string): boolean {
  try {
    return semver.gt(version, from) && semver.lte(version, to);
  } catch (error) {
    return false;
  }
}