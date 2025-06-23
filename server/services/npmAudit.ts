import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { Vulnerability, SecurityMetrics } from '@shared/schema';
import { enrichVulnerabilityWithCVE } from './cveService';
// Disabled due to GitHub API 403 errors
// import { realtimeVulnerabilityService } from './realtimeVulnerabilityService';

const execAsync = promisify(exec);

export interface NpmAuditResult {
  vulnerabilities: Vulnerability[];
  metrics: SecurityMetrics;
  advisories: any[];
}

export async function runNpmAudit(packageJsonContent: string, tempDir: string): Promise<NpmAuditResult> {
  try {
    // Write package.json to temp directory
    const packageJsonPath = path.join(tempDir, 'package.json');
    await fs.writeFile(packageJsonPath, packageJsonContent);

    // Try to create package-lock.json first
    try {
      await execAsync('npm install --package-lock-only --silent', {
        cwd: tempDir,
        timeout: 30000
      });
    } catch (lockError) {
      console.log('Could not create package-lock.json, using fallback audit method');
    }

    // Run npm audit in the temp directory
    const { stdout, stderr } = await execAsync('npm audit --json', {
      cwd: tempDir,
      timeout: 60000 // 60 second timeout
    });

    let auditData;
    try {
      auditData = JSON.parse(stdout);
    } catch (parseError) {
      console.error('Failed to parse npm audit output:', parseError);
      throw new Error('Invalid npm audit output');
    }

    return parseAuditResults(auditData);
  } catch (error) {
    console.error('NPM audit failed:', error);
    
    // NPM audit failed, but we can still extract vulnerability data from the stdout
    if (error.stdout) {
      try {
        const auditData = JSON.parse(error.stdout);
        console.log('Parsing vulnerabilities from npm audit stdout...');
        return parseAuditResults(auditData);
      } catch (parseError) {
        console.log('Could not parse npm audit stdout, returning empty results');
      }
    }
    
    // Return empty results if we can't parse anything
    return {
      vulnerabilities: [],
      metrics: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
      advisories: []
    };
  }
}

// Removed mock vulnerability function - now using real-time services

function calculateMetricsFromVulns(vulnerabilities: any[]): any {
  const metrics = { critical: 0, high: 0, moderate: 0, low: 0, total: vulnerabilities.length };
  
  vulnerabilities.forEach(vuln => {
    metrics[vuln.severity]++;
  });
  
  return metrics;
}

function parseAuditResults(auditData: any): NpmAuditResult {
  const vulnerabilities: Vulnerability[] = [];
  const metrics: SecurityMetrics = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    total: 0
  };

  // Handle different npm audit output formats
  if (auditData.advisories) {
    // npm audit format version 6
    Object.values(auditData.advisories).forEach((advisory: any) => {
      const vulnerability: Vulnerability = {
        id: advisory.id?.toString() || `vuln-${Date.now()}-${Math.random()}`,
        package: advisory.module_name || 'unknown',
        version: advisory.vulnerable_versions || 'unknown',
        severity: mapSeverity(advisory.severity),
        description: advisory.title || advisory.overview || 'No description available',
        cve: advisory.cves?.[0] || undefined,
        cvss: advisory.cvss?.score || undefined,
        fixedIn: advisory.patched_versions || undefined,
      };

      vulnerabilities.push(vulnerability);
      
      const severity = vulnerability.severity;
      metrics[severity]++;
      metrics.total++;
    });
  } else if (auditData.vulnerabilities) {
    // npm audit format version 7+
    Object.entries(auditData.vulnerabilities).forEach(([packageName, vulnData]: [string, any]) => {
      if (vulnData.via && Array.isArray(vulnData.via)) {
        vulnData.via.forEach((via: any) => {
          if (typeof via === 'object' && via.title) {
            const vulnerability: Vulnerability = {
              id: via.url?.split('/').pop() || `vuln-${Date.now()}-${Math.random()}`,
              package: packageName,
              version: vulnData.range || 'unknown',
              severity: mapSeverity(via.severity),
              description: via.title,
              cve: via.cwe ? `CWE-${via.cwe.join(', CWE-')}` : undefined,
              cvss: via.cvss?.score || undefined,
              fixedIn: vulnData.fixAvailable ? 'Available' : undefined,
            };

            vulnerabilities.push(vulnerability);
            
            const severity = vulnerability.severity;
            metrics[severity]++;
            metrics.total++;
          }
        });
      }
    });
  }

  return {
    vulnerabilities,
    metrics,
    advisories: auditData.advisories ? Object.values(auditData.advisories) : []
  };
}

function mapSeverity(severity: string): 'critical' | 'high' | 'moderate' | 'low' {
  const normalizedSeverity = severity?.toLowerCase() || 'low';
  
  switch (normalizedSeverity) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    case 'moderate':
    case 'medium':
      return 'moderate';
    case 'low':
    case 'info':
    default:
      return 'low';
  }
}

export async function getPackageInfo(packageName: string): Promise<any> {
  try {
    const { stdout } = await execAsync(`npm view ${packageName} --json`);
    return JSON.parse(stdout);
  } catch (error) {
    console.error(`Failed to get package info for ${packageName}:`, error);
    return null;
  }
}

export { enrichVulnerabilityWithCVE };
