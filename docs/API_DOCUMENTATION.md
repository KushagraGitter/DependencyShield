# DepGuard AI API Documentation

## Base URL
```
http://localhost:5000/api
```

## Table of Contents
1. [Health Check](#health-check)
2. [Package Analysis](#package-analysis)
3. [Project Analysis (ZIP Upload)](#project-analysis-zip-upload)
4. [Analysis Results](#analysis-results)
5. [Package Details](#package-details)
6. [Vulnerability Details](#vulnerability-details)
7. [Security Advisories](#security-advisories)
8. [Error Responses](#error-responses)

---

## Health Check

### GET /api/health

Check if the API server is running and healthy.

**Request:**
```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-06-25T09:26:01.948Z",
  "version": "1.0.0",
  "services": {
    "api": "running",
    "database": "connected",
    "ai": "configured"
  }
}
```

**Status Codes:**
- `200 OK` - Service is healthy

---

## Package Analysis

### POST /api/analyze-json

Analyze a package.json file for security vulnerabilities.

**Request:**
```http
POST /api/analyze-json
Content-Type: application/json

{
  "packageJson": "{\"name\":\"my-project\",\"dependencies\":{\"lodash\":\"4.17.19\",\"express\":\"4.17.1\"}}",
  "projectName": "My Project"
}
```

**Request Body Parameters:**
- `packageJson` (string, required) - Stringified package.json content
- `projectName` (string, optional) - Name of the project for reference

**Response:**
```json
{
  "sessionId": "session-1750843564006-wz4abc123",
  "vulnerabilities": [
    {
      "id": "GHSA-35jh-r3h4-6sjk",
      "package": "lodash",
      "version": "4.17.19",
      "severity": "high",
      "description": "Prototype Pollution in lodash",
      "cve": "CVE-2020-28500",
      "cvss": 7.3,
      "fixedIn": "4.17.21",
      "usageAnalysis": {
        "filesAffected": 3,
        "methodsUsed": ["merge", "get", "set"],
        "migrationRisk": "medium",
        "complexityScore": 65,
        "fileUsage": [
          {
            "fileName": "src/utils.js",
            "importStatements": ["const _ = require('lodash')"],
            "usageExamples": ["_.merge(obj1, obj2)", "_.get(data, 'user.name')"],
            "lineNumbers": [12, 45, 78]
          }
        ]
      },
      "cveDetails": {
        "id": "CVE-2020-28500",
        "description": "Lodash versions prior to 4.17.21 are vulnerable to...",
        "publishedDate": "2021-02-15T11:15:12.000Z",
        "lastModifiedDate": "2021-04-20T17:15:12.000Z",
        "cvssV3": {
          "baseScore": 7.3,
          "baseSeverity": "HIGH",
          "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L"
        },
        "hasExploit": true,
        "patchAvailable": true,
        "references": [
          {
            "url": "https://github.com/lodash/lodash/commit/d8e069cc3410082e44eb18fcf8e7f3d08ebe1d4a",
            "source": "GitHub"
          }
        ]
      },
      "releaseNotesComparison": {
        "packageName": "lodash",
        "currentVersion": "4.17.19",
        "recommendedVersion": "4.17.21",
        "summary": "Security fix for prototype pollution vulnerability",
        "breakingChanges": [],
        "securityFixes": ["Fixed prototype pollution in zipObjectDeep"],
        "migrationComplexity": "low",
        "estimatedMigrationTime": "15 minutes"
      }
    }
  ],
  "metrics": {
    "critical": 0,
    "high": 1,
    "moderate": 0,
    "low": 0,
    "total": 1
  },
  "securityScore": 85,
  "dependencyInfo": {
    "total": 2,
    "vulnerable": 1,
    "outdated": 1,
    "unused": 0
  },
  "aiSuggestions": [
    {
      "id": "suggestion-1",
      "package": "lodash",
      "currentVersion": "4.17.19",
      "suggestedAction": "update",
      "recommendation": "Update lodash to version 4.17.21 to fix prototype pollution vulnerability",
      "complexity": "low",
      "estimatedTime": "15 minutes",
      "vulnerabilitiesFixed": 1,
      "codeExample": {
        "before": "const _ = require('lodash');",
        "after": "const _ = require('lodash');"
      },
      "affectedFiles": 3
    }
  ],
  "automatedMigrations": [
    {
      "packageName": "lodash",
      "fromVersion": "4.17.19",
      "toVersion": "4.17.21",
      "migrationSteps": [
        {
          "id": "step-1",
          "type": "dependency_change",
          "title": "Update package.json",
          "description": "Update lodash dependency to version 4.17.21",
          "automated": true,
          "estimatedTime": "1 minute",
          "priority": "high"
        }
      ],
      "overallComplexity": "low",
      "automationCoverage": 100,
      "totalEstimatedTime": "15 minutes"
    }
  ],
  "id": 1,
  "createdAt": "2025-06-25T09:26:05.877Z",
  "codeAnalysis": null
}
```

**Status Codes:**
- `200 OK` - Analysis completed successfully
- `400 Bad Request` - Missing or invalid packageJson parameter
- `500 Internal Server Error` - Analysis failed

---

## Project Analysis (ZIP Upload)

### POST /api/analyze

Analyze a complete project by uploading a ZIP file containing source code and package.json.

**Request:**
```http
POST /api/analyze
Content-Type: multipart/form-data

files: [ZIP file]
projectName: "My Project"
```

**Form Data Parameters:**
- `files` (file, required) - ZIP file containing project source code
- `projectName` (string, optional) - Name of the project

**Response:**
Same structure as `/api/analyze-json` but includes additional `codeAnalysis` field:

```json
{
  "sessionId": "session-1750843564006-xyz789",
  "vulnerabilities": [...],
  "metrics": {...},
  "securityScore": 85,
  "dependencyInfo": {...},
  "aiSuggestions": [...],
  "automatedMigrations": [...],
  "id": 1,
  "createdAt": "2025-06-25T09:26:05.877Z",
  "codeAnalysis": {
    "packageUsage": {
      "lodash": {
        "importNodes": ["const _ = require('lodash')"],
        "usageNodes": ["_.merge", "_.get", "_.set"],
        "exportedSymbols": [],
        "complexityScore": 65,
        "migrationRisk": "medium",
        "fileUsage": [
          {
            "fileName": "src/utils.js",
            "importStatements": ["const _ = require('lodash')"],
            "usageExamples": ["_.merge(obj1, obj2)"],
            "lineNumbers": [12, 45]
          }
        ]
      }
    },
    "codeMetrics": {
      "totalFunctions": 25,
      "totalClasses": 3,
      "totalImports": 12,
      "cyclomaticComplexity": 15
    },
    "dependencyGraph": {
      "express": ["body-parser", "cors"],
      "lodash": []
    }
  }
}
```

**Status Codes:**
- `200 OK` - Analysis completed successfully
- `400 Bad Request` - Invalid file upload or missing files
- `413 Payload Too Large` - File size exceeds 50MB limit
- `500 Internal Server Error` - Analysis failed

---

## Analysis Results

### GET /api/analysis/:sessionId

Retrieve analysis results by session ID.

**Request:**
```http
GET /api/analysis/session-1750843564006-wz4abc123
```

**Path Parameters:**
- `sessionId` (string, required) - The session ID from a previous analysis

**Response:**
Same structure as analysis endpoints above.

**Status Codes:**
- `200 OK` - Results found and returned
- `404 Not Found` - Session ID not found
- `500 Internal Server Error` - Database error

---

## Package Details

### GET /api/package/:packageName

Get detailed information about a specific npm package including maintenance status and recommendations.

**Request:**
```http
GET /api/package/lodash
```

**Path Parameters:**
- `packageName` (string, required) - The npm package name

**Response:**
```json
{
  "name": "lodash",
  "latestVersion": "4.17.21",
  "publishedDate": "2021-02-20T17:26:01.858Z",
  "lastUpdateDate": "2021-02-20T17:26:01.858Z",
  "weeklyDownloads": 25000000,
  "maintenanceStatus": "active",
  "recommendation": "recommended",
  "upgradeComplexity": "low",
  "hasBreakingChanges": false,
  "estimatedWork": "1-2 hours",
  "securityIssues": {
    "critical": 0,
    "high": 0,
    "moderate": 0,
    "low": 0
  },
  "alternatives": [
    {
      "name": "ramda",
      "reason": "Functional programming alternative",
      "migrationComplexity": "high"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - Package information retrieved
- `404 Not Found` - Package not found in npm registry
- `500 Internal Server Error` - Failed to fetch package information

---

## Vulnerability Details

### GET /api/vulnerability/:cveId

Get detailed information about a specific CVE vulnerability.

**Request:**
```http
GET /api/vulnerability/CVE-2020-28500
```

**Path Parameters:**
- `cveId` (string, required) - The CVE identifier

**Response:**
```json
{
  "id": "CVE-2020-28500",
  "description": "Lodash versions prior to 4.17.21 are vulnerable to Regular Expression Denial of Service (ReDoS) via the toNumber, trim and trimEnd functions.",
  "publishedDate": "2021-02-15T11:15:12.000Z",
  "lastModifiedDate": "2021-04-20T17:15:12.000Z",
  "cvssV3": {
    "baseScore": 7.3,
    "baseSeverity": "HIGH",
    "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L",
    "attackVector": "NETWORK",
    "attackComplexity": "LOW",
    "privilegesRequired": "NONE",
    "userInteraction": "NONE",
    "scope": "UNCHANGED",
    "confidentialityImpact": "LOW",
    "integrityImpact": "LOW",
    "availabilityImpact": "LOW"
  },
  "cvssV2": {
    "baseScore": 6.8,
    "baseSeverity": "MEDIUM",
    "vectorString": "AV:N/AC:M/Au:N/C:P/I:P/A:P"
  },
  "references": [
    {
      "url": "https://github.com/lodash/lodash/commit/d8e069cc3410082e44eb18fcf8e7f3d08ebe1d4a",
      "source": "GitHub",
      "tags": ["Patch"]
    },
    {
      "url": "https://www.npmjs.com/advisories/1673",
      "source": "NPM",
      "tags": ["Advisory"]
    }
  ],
  "configurations": [
    {
      "operator": "OR",
      "cpeMatch": [
        {
          "vulnerable": true,
          "criteria": "cpe:2.3:a:lodash:lodash:*:*:*:*:*:node.js:*:*",
          "versionEndExcluding": "4.17.21"
        }
      ]
    }
  ],
  "exploitabilityScore": 3.9,
  "impactScore": 3.6,
  "hasExploit": false,
  "patchAvailable": true,
  "affectedPackages": ["lodash"]
}
```

**Status Codes:**
- `200 OK` - CVE details retrieved successfully
- `404 Not Found` - CVE not found
- `500 Internal Server Error` - Failed to fetch CVE details

---

## Security Advisories

### GET /api/advisories/:packageName

Get security advisories for a specific package.

**Request:**
```http
GET /api/advisories/lodash
```

**Path Parameters:**
- `packageName` (string, required) - The npm package name

**Response:**
```json
[
  {
    "id": "GHSA-35jh-r3h4-6sjk",
    "summary": "Prototype Pollution in lodash",
    "details": "Lodash versions prior to 4.17.21 are vulnerable to Command Injection via the template function.",
    "severity": "high",
    "publishedAt": "2021-02-15T11:15:12.000Z",
    "updatedAt": "2021-04-20T17:15:12.000Z",
    "cveId": "CVE-2020-28500",
    "cwe": ["CWE-94"],
    "ecosystem": "npm",
    "packageName": "lodash",
    "vulnerableVersionRange": "< 4.17.21",
    "patchedVersions": ["4.17.21"],
    "references": [
      {
        "type": "ADVISORY",
        "url": "https://github.com/advisories/GHSA-35jh-r3h4-6sjk"
      },
      {
        "type": "WEB",
        "url": "https://github.com/lodash/lodash/commit/d8e069cc3410082e44eb18fcf8e7f3d08ebe1d4a"
      }
    ],
    "credits": [
      {
        "user": "security-researcher",
        "type": "FINDER"
      }
    ]
  }
]
```

**Status Codes:**
- `200 OK` - Advisories retrieved successfully
- `404 Not Found` - No advisories found for package
- `500 Internal Server Error` - Failed to fetch advisories

---

## Error Responses

All API endpoints may return these standard error responses:

### 400 Bad Request
```json
{
  "error": "packageJson is required",
  "code": "MISSING_PARAMETER"
}
```

### 404 Not Found
```json
{
  "error": "Session not found",
  "sessionId": "session-invalid-123"
}
```

### 413 Payload Too Large
```json
{
  "error": "File size exceeds maximum limit of 50MB",
  "code": "FILE_TOO_LARGE"
}
```

### 500 Internal Server Error
```json
{
  "error": "Analysis failed: npm audit command failed",
  "code": "ANALYSIS_ERROR",
  "details": "Command failed: npm audit --json"
}
```

---

## Data Types

### Vulnerability Object
```typescript
interface Vulnerability {
  id: string;                    // Unique vulnerability identifier
  package: string;               // Package name
  version: string;               // Vulnerable version
  severity: 'critical' | 'high' | 'moderate' | 'low';
  description: string;           // Vulnerability description
  cve?: string;                  // CVE identifier if available
  cvss?: number;                 // CVSS score
  fixedIn?: string;              // Version that fixes the vulnerability
  usageAnalysis?: UsageAnalysis; // Code usage analysis
  cveDetails?: CVEDetails;       // Detailed CVE information
  releaseNotesComparison?: ReleaseNotesComparison;
}
```

### Security Metrics
```typescript
interface SecurityMetrics {
  critical: number;  // Count of critical vulnerabilities
  high: number;      // Count of high severity vulnerabilities
  moderate: number;  // Count of moderate severity vulnerabilities
  low: number;       // Count of low severity vulnerabilities
  total: number;     // Total vulnerability count
}
```

### Dependency Info
```typescript
interface DependencyInfo {
  total: number;     // Total number of dependencies
  vulnerable: number; // Number of vulnerable dependencies
  outdated: number;  // Number of outdated dependencies
  unused: number;    // Number of unused dependencies
}
```

### AI Migration Suggestion
```typescript
interface AIMigrationSuggestion {
  id: string;
  package: string;
  currentVersion: string;
  suggestedAction: 'update' | 'replace' | 'remove';
  recommendation: string;
  complexity: 'low' | 'medium' | 'high';
  estimatedTime: string;
  vulnerabilitiesFixed: number;
  codeExample?: {
    before: string;
    after: string;
  };
  affectedFiles?: number;
  bundleSizeReduction?: string;
}
```

---

## Rate Limits

- Analysis endpoints: 10 requests per minute per IP
- Package details: 60 requests per minute per IP
- Health check: No rate limit

## Authentication

Currently, no authentication is required for API access. All endpoints are publicly accessible.

## CORS

CORS is enabled for all origins in development mode. In production, configure appropriate CORS policies.