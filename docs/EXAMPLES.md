# DepGuard AI API Examples

This document provides practical examples of using the DepGuard AI API for various vulnerability analysis scenarios.

## Basic Package Analysis

### Analyze a Simple Package.json

**Request:**
```bash
curl -X POST http://localhost:5000/api/analyze-json \
  -H "Content-Type: application/json" \
  -d '{
    "packageJson": "{\"name\":\"my-app\",\"dependencies\":{\"lodash\":\"4.17.19\",\"express\":\"4.17.1\",\"axios\":\"0.21.0\"}}",
    "projectName": "My Web Application"
  }'
```

**Response:**
```json
{
  "sessionId": "session-1750843564006-abc123",
  "vulnerabilities": [
    {
      "id": "GHSA-35jh-r3h4-6sjk",
      "package": "lodash",
      "version": "4.17.19",
      "severity": "high",
      "description": "Prototype Pollution in lodash",
      "cve": "CVE-2020-28500",
      "cvss": 7.3,
      "fixedIn": "4.17.21"
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
  "aiSuggestions": [
    {
      "package": "lodash",
      "suggestedAction": "update",
      "recommendation": "Update lodash to version 4.17.21",
      "complexity": "low",
      "estimatedTime": "15 minutes"
    }
  ]
}
```

## Project Analysis with ZIP Upload

### Upload and Analyze Complete Project

**Request:**
```bash
curl -X POST http://localhost:5000/api/analyze \
  -F "files=@my-project.zip" \
  -F "projectName=My Full Project"
```

**Response includes additional code analysis:**
```json
{
  "sessionId": "session-1750843564006-xyz789",
  "vulnerabilities": [...],
  "codeAnalysis": {
    "packageUsage": {
      "lodash": {
        "importNodes": ["const _ = require('lodash')"],
        "usageNodes": ["_.merge", "_.get", "_.set"],
        "complexityScore": 65,
        "migrationRisk": "medium",
        "fileUsage": [
          {
            "fileName": "src/utils/helpers.js",
            "importStatements": ["const _ = require('lodash')"],
            "usageExamples": ["_.merge(defaultConfig, userConfig)"],
            "lineNumbers": [5, 23, 45]
          }
        ]
      }
    }
  }
}
```

## Retrieving Analysis Results

### Get Analysis by Session ID

**Request:**
```bash
curl http://localhost:5000/api/analysis/session-1750843564006-abc123
```

**Use Case:** Check analysis status or retrieve results later

## Package Information

### Get Detailed Package Information

**Request:**
```bash
curl http://localhost:5000/api/package/express
```

**Response:**
```json
{
  "name": "express",
  "latestVersion": "4.18.2",
  "weeklyDownloads": 25000000,
  "maintenanceStatus": "active",
  "recommendation": "recommended",
  "upgradeComplexity": "low",
  "securityIssues": {
    "critical": 0,
    "high": 0,
    "moderate": 0,
    "low": 0
  }
}
```

## Advanced Use Cases

### Batch Analysis Workflow

1. **Upload multiple projects:**
```bash
# Analyze first project
SESSION1=$(curl -s -X POST http://localhost:5000/api/analyze-json \
  -H "Content-Type: application/json" \
  -d '{"packageJson":"...", "projectName":"Project 1"}' | jq -r '.sessionId')

# Analyze second project  
SESSION2=$(curl -s -X POST http://localhost:5000/api/analyze-json \
  -H "Content-Type: application/json" \
  -d '{"packageJson":"...", "projectName":"Project 2"}' | jq -r '.sessionId')
```

2. **Retrieve and compare results:**
```bash
# Get results for both projects
curl http://localhost:5000/api/analysis/$SESSION1 > project1-results.json
curl http://localhost:5000/api/analysis/$SESSION2 > project2-results.json
```

### Security Monitoring

**Check multiple packages for vulnerabilities:**
```bash
PACKAGES=("lodash" "express" "axios" "react" "vue")

for package in "${PACKAGES[@]}"; do
  echo "Checking $package..."
  curl -s http://localhost:5000/api/package/$package | jq '.securityIssues'
done
```

### Vulnerability Research

**Get detailed CVE information:**
```bash
curl http://localhost:5000/api/vulnerability/CVE-2020-28500
```

**Get security advisories for a package:**
```bash
curl http://localhost:5000/api/advisories/lodash
```

## Error Handling Examples

### Handle Missing Package.json

**Request:**
```bash
curl -X POST http://localhost:5000/api/analyze-json \
  -H "Content-Type: application/json" \
  -d '{"projectName": "Test"}'
```

**Response:**
```json
{
  "error": "packageJson is required",
  "code": "MISSING_PARAMETER"
}
```

### Handle Invalid Session ID

**Request:**
```bash
curl http://localhost:5000/api/analysis/invalid-session-id
```

**Response:**
```json
{
  "error": "Session not found",
  "sessionId": "invalid-session-id"
}
```

## Integration Examples

### Node.js Client

```javascript
import axios from 'axios';

class DepGuardClient {
  constructor(baseURL = 'http://localhost:5000/api') {
    this.client = axios.create({ baseURL });
  }

  async analyzePackage(packageJson, projectName) {
    const response = await this.client.post('/analyze-json', {
      packageJson: JSON.stringify(packageJson),
      projectName
    });
    return response.data;
  }

  async getAnalysis(sessionId) {
    const response = await this.client.get(`/analysis/${sessionId}`);
    return response.data;
  }

  async getPackageDetails(packageName) {
    const response = await this.client.get(`/package/${packageName}`);
    return response.data;
  }
}

// Usage
const client = new DepGuardClient();

const packageJson = {
  name: "my-app",
  dependencies: {
    "lodash": "4.17.19",
    "express": "4.17.1"
  }
};

const analysis = await client.analyzePackage(packageJson, "My App");
console.log(`Security Score: ${analysis.securityScore}`);
console.log(`Vulnerabilities Found: ${analysis.metrics.total}`);
```

### Python Client

```python
import requests
import json

class DepGuardClient:
    def __init__(self, base_url="http://localhost:5000/api"):
        self.base_url = base_url

    def analyze_package(self, package_json, project_name=None):
        url = f"{self.base_url}/analyze-json"
        data = {
            "packageJson": json.dumps(package_json),
            "projectName": project_name
        }
        response = requests.post(url, json=data)
        response.raise_for_status()
        return response.json()

    def get_analysis(self, session_id):
        url = f"{self.base_url}/analysis/{session_id}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()

# Usage
client = DepGuardClient()

package_json = {
    "name": "my-app",
    "dependencies": {
        "lodash": "4.17.19",
        "express": "4.17.1"
    }
}

analysis = client.analyze_package(package_json, "My Python App")
print(f"Security Score: {analysis['securityScore']}")
print(f"Vulnerabilities: {analysis['metrics']['total']}")
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Security Audit
on: [push, pull_request]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup DepGuard
        run: |
          # Start DepGuard server
          npm install
          npm run dev &
          sleep 10
      
      - name: Run Security Analysis
        run: |
          PACKAGE_JSON=$(cat package.json | jq -c .)
          RESULT=$(curl -X POST http://localhost:5000/api/analyze-json \
            -H "Content-Type: application/json" \
            -d "{\"packageJson\":\"$PACKAGE_JSON\",\"projectName\":\"CI Build\"}")
          
          SCORE=$(echo $RESULT | jq '.securityScore')
          VULNS=$(echo $RESULT | jq '.metrics.total')
          
          echo "Security Score: $SCORE"
          echo "Vulnerabilities: $VULNS"
          
          if [ $SCORE -lt 80 ]; then
            echo "Security score too low!"
            exit 1
          fi
```

## Health Monitoring

### Basic Health Check

```bash
#!/bin/bash
# health-check.sh

HEALTH=$(curl -s http://localhost:5000/api/health)
STATUS=$(echo $HEALTH | jq -r '.status')

if [ "$STATUS" = "ok" ]; then
  echo "✅ DepGuard API is healthy"
  exit 0
else
  echo "❌ DepGuard API is down"
  exit 1
fi
```

### Detailed Service Monitoring

```bash
#!/bin/bash
# monitor-services.sh

HEALTH=$(curl -s http://localhost:5000/api/health)
API_STATUS=$(echo $HEALTH | jq -r '.services.api')
DB_STATUS=$(echo $HEALTH | jq -r '.services.database')
AI_STATUS=$(echo $HEALTH | jq -r '.services.ai')

echo "API Status: $API_STATUS"
echo "Database Status: $DB_STATUS"
echo "AI Service Status: $AI_STATUS"

if [ "$API_STATUS" != "running" ] || [ "$DB_STATUS" != "connected" ] || [ "$AI_STATUS" != "configured" ]; then
  echo "⚠️  One or more services are not healthy"
  exit 1
fi

echo "✅ All services are healthy"
```