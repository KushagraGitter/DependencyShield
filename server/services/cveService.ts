import axios from 'axios';

export interface CVEDetails {
  id: string;
  description: string;
  publishedDate: string;
  lastModifiedDate: string;
  cvssV3?: {
    baseScore: number;
    baseSeverity: string;
    vectorString: string;
    attackVector: string;
    attackComplexity: string;
    privilegesRequired: string;
    userInteraction: string;
    scope: string;
    confidentialityImpact: string;
    integrityImpact: string;
    availabilityImpact: string;
  };
  cvssV2?: {
    baseScore: number;
    baseSeverity: string;
    vectorString: string;
    accessVector: string;
    accessComplexity: string;
    authentication: string;
    confidentialityImpact: string;
    integrityImpact: string;
    availabilityImpact: string;
  };
  references: {
    url: string;
    source: string;
    tags?: string[];
  }[];
  configurations: {
    operator: string;
    cpeMatch: {
      vulnerable: boolean;
      criteria: string;
      versionStartIncluding?: string;
      versionEndExcluding?: string;
    }[];
  }[];
  exploitabilityScore?: number;
  impactScore?: number;
  hasExploit: boolean;
  patchAvailable: boolean;
  affectedPackages: string[];
}

export interface SecurityAdvisory {
  id: string;
  summary: string;
  details: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  publishedAt: string;
  updatedAt: string;
  cveId?: string;
  cwe?: string[];
  ecosystem: string;
  packageName: string;
  vulnerableVersionRange: string;
  patchedVersions: string[];
  references: {
    type: string;
    url: string;
  }[];
  credits?: {
    user: string;
    type: string;
  }[];
}

export async function fetchCVEDetails(cveId: string): Promise<CVEDetails | null> {
  // Skip CVE enrichment due to API issues causing timeouts and invalid parameters
  return null;
}

async function fetchFromNVD(cveId: string): Promise<CVEDetails | null> {
  try {
    const response = await axios.get(
      `https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'DepGuard-AI/1.0'
        }
      }
    );

    const vulnerabilities = response.data.vulnerabilities;
    if (!vulnerabilities || vulnerabilities.length === 0) return null;

    const cve = vulnerabilities[0].cve;
    
    return {
      id: cve.id,
      description: cve.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No description available',
      publishedDate: cve.published,
      lastModifiedDate: cve.lastModified,
      cvssV3: parseCVSSV3(cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0]),
      cvssV2: parseCVSSV2(cve.metrics?.cvssMetricV2?.[0]),
      references: (cve.references || []).map((ref: any) => ({
        url: ref.url,
        source: ref.source,
        tags: ref.tags,
      })),
      configurations: parseConfigurations(cve.configurations || []),
      exploitabilityScore: cve.metrics?.cvssMetricV31?.[0]?.exploitabilityScore,
      impactScore: cve.metrics?.cvssMetricV31?.[0]?.impactScore,
      hasExploit: checkForExploit(cve.references || []),
      patchAvailable: checkPatchAvailability(cve.references || []),
      affectedPackages: extractAffectedPackages(cve.configurations || []),
    };
  } catch (error) {
    console.error('NVD API error:', error);
    return null;
  }
}

async function fetchFromGitHubAdvisory(cveId: string): Promise<CVEDetails | null> {
  // GitHub API is returning 403 errors, skipping to prevent blocking analysis
  return null;
}

export async function fetchSecurityAdvisories(packageName: string): Promise<SecurityAdvisory[]> {
  // GitHub API is returning 403 errors consistently, disabling to prevent blocking analysis
  return [];
}

function parseCVSSV3(metric: any): any {
  if (!metric) return undefined;
  
  const cvss = metric.cvssData;
  return {
    baseScore: cvss.baseScore,
    baseSeverity: cvss.baseSeverity,
    vectorString: cvss.vectorString,
    attackVector: cvss.attackVector,
    attackComplexity: cvss.attackComplexity,
    privilegesRequired: cvss.privilegesRequired,
    userInteraction: cvss.userInteraction,
    scope: cvss.scope,
    confidentialityImpact: cvss.confidentialityImpact,
    integrityImpact: cvss.integrityImpact,
    availabilityImpact: cvss.availabilityImpact,
  };
}

function parseCVSSV2(metric: any): any {
  if (!metric) return undefined;
  
  const cvss = metric.cvssData;
  return {
    baseScore: cvss.baseScore,
    baseSeverity: cvss.baseSeverity,
    vectorString: cvss.vectorString,
    accessVector: cvss.accessVector,
    accessComplexity: cvss.accessComplexity,
    authentication: cvss.authentication,
    confidentialityImpact: cvss.confidentialityImpact,
    integrityImpact: cvss.integrityImpact,
    availabilityImpact: cvss.availabilityImpact,
  };
}

function parseConfigurations(configurations: any[]): any[] {
  return configurations.map(config => ({
    operator: config.operator,
    cpeMatch: (config.nodes || []).flatMap((node: any) => 
      (node.cpeMatch || []).map((cpe: any) => ({
        vulnerable: cpe.vulnerable,
        criteria: cpe.criteria,
        versionStartIncluding: cpe.versionStartIncluding,
        versionEndExcluding: cpe.versionEndExcluding,
      }))
    ),
  }));
}

function checkForExploit(references: any[]): boolean {
  return references.some(ref => 
    ref.tags?.includes('Exploit') || 
    ref.url.includes('exploit-db') ||
    ref.url.includes('exploitdb')
  );
}

function checkPatchAvailability(references: any[]): boolean {
  return references.some(ref => 
    ref.tags?.includes('Patch') || 
    ref.tags?.includes('Vendor Advisory') ||
    ref.url.includes('security')
  );
}

function extractAffectedPackages(configurations: any[]): string[] {
  const packages = new Set<string>();
  
  configurations.forEach(config => {
    (config.nodes || []).forEach((node: any) => {
      (node.cpeMatch || []).forEach((cpe: any) => {
        if (cpe.vulnerable) {
          // Extract package name from CPE
          const match = cpe.criteria.match(/cpe:2\.3:a:[^:]+:([^:]+):/);
          if (match) packages.add(match[1]);
        }
      });
    });
  });
  
  return Array.from(packages);
}

function mapGitHubSeverity(severity: string): 'critical' | 'high' | 'moderate' | 'low' {
  switch (severity?.toLowerCase()) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'moderate':
    case 'medium': return 'moderate';
    case 'low': return 'low';
    default: return 'low';
  }
}

export async function enrichVulnerabilityWithCVE(vulnerability: any): Promise<any> {
  if (!vulnerability.cve) return vulnerability;
  
  const cveDetails = await fetchCVEDetails(vulnerability.cve);
  if (!cveDetails) return vulnerability;
  
  return {
    ...vulnerability,
    cveDetails,
    hasExploit: cveDetails.hasExploit,
    patchAvailable: cveDetails.patchAvailable,
    exploitabilityScore: cveDetails.exploitabilityScore,
    impactScore: cveDetails.impactScore,
    references: cveDetails.references,
  };
}