#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import axios from 'axios';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Define the base URL for the DepGuard API - use IPv4 to avoid IPv6 issues
const DEPGUARD_API_BASE = process.env.DEPGUARD_API_URL || 'http://127.0.0.1:5000';

// Add connection validation
async function validateApiConnection(): Promise<boolean> {
  try {
    const response = await axios.get(`${DEPGUARD_API_BASE}/api/health`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.error(`Failed to connect to DepGuard API at ${DEPGUARD_API_BASE}:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Define schemas for tool inputs
const AnalyzePackageJsonSchema = z.object({
  packageJsonContent: z.string().describe('The content of package.json file as a string'),
  projectName: z.string().optional().describe('Optional project name for analysis')
});

const AnalyzeProjectZipSchema = z.object({
  zipFilePath: z.string().describe('Path to the ZIP file containing the project'),
  includeCodeAnalysis: z.boolean().default(true).describe('Whether to include AST code analysis')
});

const GetVulnerabilityDetailsSchema = z.object({
  sessionId: z.string().describe('Session ID from a previous analysis'),
  vulnerabilityId: z.string().optional().describe('Specific vulnerability ID to get details for')
});

const GetPackageDetailsSchema = z.object({
  packageName: z.string().describe('Name of the npm package to analyze'),
  includeReleaseComparison: z.boolean().default(false).describe('Whether to include release notes comparison')
});

const ScanPackageJsonFileSchema = z.object({
  filePath: z.string().describe('Path to the package.json file')
});

const AnalyzeSinglePackageSchema = z.object({
  packageName: z.string().describe('Name of the npm package to analyze'),
  version: z.string().optional().describe('Specific version to analyze')
});

const CheckDependencyHierarchySchema = z.object({
  packageJsonContent: z.string().describe('The package.json content as a string'),
  targetPackage: z.string().describe('The package to check dependency hierarchy for')
});

const GetAlternativePackagesSchema = z.object({
  packageName: z.string().describe('Name of the package to find alternatives for')
});

const server = new Server(
  {
    name: 'depguard-mcp-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'analyze_package_json',
        description: 'Analyze a package.json file for security vulnerabilities and get AI-powered migration suggestions',
        inputSchema: {
          type: 'object',
          properties: {
            packageJsonContent: {
              type: 'string',
              description: 'The content of package.json file as a string'
            },
            projectName: {
              type: 'string',
              description: 'Optional project name for analysis'
            }
          },
          required: ['packageJsonContent']
        }
      },
      {
        name: 'analyze_project_zip',
        description: 'Analyze a complete project from a ZIP file including deep code analysis and vulnerability detection',
        inputSchema: {
          type: 'object',
          properties: {
            zipFilePath: {
              type: 'string',
              description: 'Path to the ZIP file containing the project'
            },
            includeCodeAnalysis: {
              type: 'boolean',
              description: 'Whether to include AST code analysis',
              default: true
            }
          },
          required: ['zipFilePath']
        }
      },
      {
        name: 'get_vulnerability_details',
        description: 'Get detailed information about vulnerabilities from a previous analysis',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              description: 'Session ID from a previous analysis'
            },
            vulnerabilityId: {
              type: 'string',
              description: 'Specific vulnerability ID to get details for'
            }
          },
          required: ['sessionId']
        }
      },
      {
        name: 'get_package_details',
        description: 'Get detailed information about a specific npm package including maintenance status and upgrade recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            packageName: {
              type: 'string',
              description: 'Name of the npm package to analyze'
            },
            includeReleaseComparison: {
              type: 'boolean',
              description: 'Whether to include release notes comparison',
              default: false
            }
          },
          required: ['packageName']
        }
      },
      {
        name: 'scan_package_json_file',
        description: 'Scan a package.json file from the filesystem for vulnerabilities with dependency hierarchy tracking',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the package.json file (relative to current working directory)'
            }
          },
          required: ['filePath']
        }
      },
      {
        name: 'analyze_single_package',
        description: 'Analyze a single npm package for vulnerabilities and get package details with alternative suggestions',
        inputSchema: {
          type: 'object',
          properties: {
            packageName: {
              type: 'string',
              description: 'Name of the npm package to analyze'
            },
            version: {
              type: 'string',
              description: 'Specific version to analyze (optional, defaults to latest)'
            }
          },
          required: ['packageName']
        }
      },
      {
        name: 'check_dependency_hierarchy',
        description: 'Check if a vulnerability is from direct or transitive dependencies and show dependency chain',
        inputSchema: {
          type: 'object',
          properties: {
            packageJsonContent: {
              type: 'string',
              description: 'The package.json content as a string'
            },
            targetPackage: {
              type: 'string',
              description: 'The package to check dependency hierarchy for'
            }
          },
          required: ['packageJsonContent', 'targetPackage']
        }
      },
      {
        name: 'get_alternative_packages',
        description: 'Get alternative packages for deprecated or vulnerable packages with migration guidance',
        inputSchema: {
          type: 'object',
          properties: {
            packageName: {
              type: 'string',
              description: 'Name of the package to find alternatives for'
            }
          },
          required: ['packageName']
        }
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'analyze_package_json': {
        const { packageJsonContent, projectName } = AnalyzePackageJsonSchema.parse(args);
        
        // Create a temporary package.json file
        const tempDir = tmpdir();
        const tempPath = join(tempDir, `package-${Date.now()}.json`);
        writeFileSync(tempPath, packageJsonContent);
        
        try {
          const response = await axios.post(
            `${DEPGUARD_API_BASE}/api/analyze-json`,
            { packageJson: packageJsonContent, projectName },
            { headers: { 'Content-Type': 'application/json' } }
          );
          
          return {
            content: [
              {
                type: 'text',
                text: `# Vulnerability Analysis Results\n\n${JSON.stringify(response.data, null, 2)}`
              }
            ]
          };
        } finally {
          // Clean up temp file
          if (existsSync(tempPath)) {
            unlinkSync(tempPath);
          }
        }
      }

      case 'analyze_project_zip': {
        const { zipFilePath, includeCodeAnalysis } = AnalyzeProjectZipSchema.parse(args);
        
        if (!existsSync(zipFilePath)) {
          throw new McpError(ErrorCode.InvalidParams, `ZIP file not found: ${zipFilePath}`);
        }

        const formData = new FormData();
        formData.append('projectZip', createReadStream(zipFilePath));
        if (!includeCodeAnalysis) {
          formData.append('skipCodeAnalysis', 'true');
        }

        const response = await axios.post(
          `${DEPGUARD_API_BASE}/api/analyze`,
          formData,
          { 
            headers: {
              ...formData.getHeaders(),
            },
            timeout: 120000 // 2 minutes timeout for large projects
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: `# Project Analysis Results\n\nSession ID: ${response.data.sessionId}\n\n${JSON.stringify(response.data, null, 2)}`
            }
          ]
        };
      }

      case 'get_vulnerability_details': {
        const { sessionId, vulnerabilityId } = GetVulnerabilityDetailsSchema.parse(args);
        
        const response = await axios.get(`${DEPGUARD_API_BASE}/api/analysis/${sessionId}`);
        
        let result = response.data;
        if (vulnerabilityId && result.vulnerabilities) {
          const vulnerability = result.vulnerabilities.find((v: any) => v.id === vulnerabilityId);
          if (vulnerability) {
            result = { vulnerability, sessionId };
          } else {
            throw new McpError(ErrorCode.InvalidParams, `Vulnerability not found: ${vulnerabilityId}`);
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: `# Vulnerability Details\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }

      case 'get_package_details': {
        const { packageName, includeReleaseComparison } = GetPackageDetailsSchema.parse(args);
        
        const response = await axios.get(`${DEPGUARD_API_BASE}/api/package-details/${packageName}`);
        
        return {
          content: [
            {
              type: 'text',
              text: `# Package Details: ${packageName}\n\n${JSON.stringify(response.data, null, 2)}`
            }
          ]
        };
      }

      case 'scan_package_json_file': {
        const { filePath } = args;
        
        if (!filePath || typeof filePath !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid file path provided');
        }

        // Read and parse the package.json file
        if (!existsSync(filePath)) {
          throw new McpError(ErrorCode.InvalidParams, `File not found: ${filePath}`);
        }

        const fileContent = require('fs').readFileSync(filePath, 'utf8');
        let packageJsonContent;
        
        try {
          packageJsonContent = JSON.parse(fileContent);
        } catch (parseError) {
          throw new McpError(ErrorCode.InvalidParams, `Invalid JSON in package.json file: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
        }

        // Validate API connection
        const isConnected = await validateApiConnection();
        if (!isConnected) {
          throw new McpError(ErrorCode.InternalError, 'Unable to connect to DepGuard AI API. Please ensure the server is running on http://127.0.0.1:5000');
        }

        const response = await axios.post(
          `${DEPGUARD_API_BASE}/api/analyze-json`,
          { packageJson: packageJsonContent },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const result = response.data;
        const formattedVulns = result.vulnerabilities?.map((vuln: any) => `
### ${vuln.package} (${vuln.version})
- **Severity:** ${vuln.severity.toUpperCase()}
- **Dependency Type:** ${vuln.isDirect ? 'Direct' : 'Transitive'}${vuln.dependencyPath ? `
- **Dependency Chain:** ${vuln.dependencyPath.join(' → ')}` : ''}
- **Description:** ${vuln.description}
- **CVE:** ${vuln.cve || 'N/A'}
- **Fixed In:** ${vuln.fixedIn || 'Not specified'}
        `).join('\n') || 'No vulnerabilities found!';

        return {
          content: [
            {
              type: 'text',
              text: `# Package.json Vulnerability Analysis

## Security Summary
- **Total Vulnerabilities:** ${result.vulnerabilities?.length || 0}
- **Security Score:** ${result.securityScore}/100
- **Critical:** ${result.securityMetrics?.critical || 0}
- **High:** ${result.securityMetrics?.high || 0}
- **Moderate:** ${result.securityMetrics?.moderate || 0}
- **Low:** ${result.securityMetrics?.low || 0}

## Vulnerabilities Found
${formattedVulns}

**Session ID:** ${result.sessionId}
For detailed analysis with dependency hierarchy tracking, visit: http://127.0.0.1:5000`
            }
          ]
        };
      }

      case 'analyze_single_package': {
        const { packageName, version } = args;
        
        if (!packageName || typeof packageName !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid package name provided');
        }

        // Validate API connection
        const isConnected = await validateApiConnection();
        if (!isConnected) {
          throw new McpError(ErrorCode.InternalError, 'Unable to connect to DepGuard AI API. Please ensure the server is running on http://127.0.0.1:5000');
        }

        // Get package details
        const packageResponse = await axios.get(`${DEPGUARD_API_BASE}/api/package-details/${encodeURIComponent(packageName)}`);
        const packageDetails = packageResponse.data;

        // Create minimal package.json for analysis
        const testPackageJson = {
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            [packageName]: version || packageDetails.latestVersion || "latest"
          }
        };

        // Analyze for vulnerabilities
        const analysisResponse = await axios.post(
          `${DEPGUARD_API_BASE}/api/analyze-json`,
          { packageJson: testPackageJson },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const analysisResult = analysisResponse.data;

        return {
          content: [
            {
              type: 'text',
              text: `# Single Package Analysis: ${packageName}

## Package Details
- **Name:** ${packageDetails.name}
- **Current Version:** ${packageDetails.currentVersion || version || 'latest'}
- **Latest Version:** ${packageDetails.latestVersion}
- **Weekly Downloads:** ${packageDetails.weeklyDownloads?.toLocaleString() || 'N/A'}
- **Maintenance Status:** ${packageDetails.maintainerStatus}
- **Has Breaking Changes:** ${packageDetails.hasBreakingChanges ? 'Yes' : 'No'}

${packageDetails.deprecationInfo?.isDeprecated ? `
## ⚠️ Deprecation Warning
- **Status:** DEPRECATED
- **Message:** ${packageDetails.deprecationInfo.message}
- **Date:** ${packageDetails.deprecationInfo.date}

${packageDetails.alternatives?.length > 0 ? `## Alternative Packages
${packageDetails.alternatives.map((alt: string) => `- ${alt}`).join('\n')}` : ''}
` : ''}

## Vulnerability Analysis
- **Vulnerabilities Found:** ${analysisResult.vulnerabilities?.length || 0}
- **Security Score:** ${analysisResult.securityScore}/100

${analysisResult.vulnerabilities?.length > 0 ? `
### Vulnerabilities
${analysisResult.vulnerabilities.map((vuln: any) => `
- **${vuln.package}** (${vuln.severity.toUpperCase()})
  - ${vuln.description}
  - CVE: ${vuln.cve || 'N/A'}
  - Fixed In: ${vuln.fixedIn || 'Not specified'}
`).join('\n')}
` : '✅ No vulnerabilities found in this package!'}

For detailed analysis and migration guidance, visit: http://127.0.0.1:5000`
            }
          ]
        };
      }

      case 'check_dependency_hierarchy': {
        const { packageJsonContent, targetPackage } = args;
        
        if (!packageJsonContent || typeof packageJsonContent !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid package.json content provided');
        }
        
        if (!targetPackage || typeof targetPackage !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid target package provided');
        }

        let packageJson;
        try {
          packageJson = JSON.parse(packageJsonContent);
        } catch (parseError) {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid JSON in package.json content');
        }

        const directDeps = packageJson.dependencies || {};
        const devDeps = packageJson.devDependencies || {};
        const peerDeps = packageJson.peerDependencies || {};
        
        const isDirect = !!(directDeps[targetPackage] || devDeps[targetPackage] || peerDeps[targetPackage]);
        
        let dependencyType = 'transitive';
        if (directDeps[targetPackage]) dependencyType = 'direct (production)';
        else if (devDeps[targetPackage]) dependencyType = 'direct (development)';
        else if (peerDeps[targetPackage]) dependencyType = 'direct (peer)';

        return {
          content: [
            {
              type: 'text',
              text: `# Dependency Hierarchy Analysis

## Package: ${targetPackage}
- **Type:** ${dependencyType}
- **Is Direct Dependency:** ${isDirect ? 'Yes' : 'No'}

${isDirect ? `
## Resolution Strategy
Since this is a direct dependency, you can:
1. Update the package directly in your package.json
2. Run \`npm update ${targetPackage}\` to get the latest compatible version
3. Run \`npm install ${targetPackage}@latest\` to upgrade to the latest version

` : `
## Resolution Strategy
Since this is a transitive dependency, you should:
1. Check which of your direct dependencies requires this package
2. Update the parent dependency to a version that uses a secure version
3. Use \`npm audit fix\` to automatically resolve if possible
4. Consider using npm overrides to force a specific version if needed

## Finding Parent Dependencies
Run these commands to find which packages depend on ${targetPackage}:
\`\`\`bash
npm ls ${targetPackage}
npm why ${targetPackage}
\`\`\`
`}

For visual dependency hierarchy tracking, visit: http://127.0.0.1:5000`
            }
          ]
        };
      }

      case 'get_alternative_packages': {
        const { packageName } = args;
        
        if (!packageName || typeof packageName !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid package name provided');
        }

        // Validate API connection
        const isConnected = await validateApiConnection();
        if (!isConnected) {
          throw new McpError(ErrorCode.InternalError, 'Unable to connect to DepGuard AI API. Please ensure the server is running on http://127.0.0.1:5000');
        }

        const packageResponse = await axios.get(`${DEPGUARD_API_BASE}/api/package-details/${encodeURIComponent(packageName)}`);
        const packageDetails = packageResponse.data;

        return {
          content: [
            {
              type: 'text',
              text: `# Alternative Packages for ${packageName}

## Package Status
- **Maintenance Status:** ${packageDetails.maintainerStatus}
${packageDetails.deprecationInfo?.isDeprecated ? `- **Deprecated:** Yes (${packageDetails.deprecationInfo.date})
- **Deprecation Message:** ${packageDetails.deprecationInfo.message}` : '- **Deprecated:** No'}

${packageDetails.alternatives?.length > 0 ? `
## Recommended Alternatives

${packageDetails.alternatives.map((alt: string, index: number) => `
### ${index + 1}. ${alt}
- Install: \`npm install ${alt}\`
- Migration guidance available at: http://127.0.0.1:5000
`).join('\n')}

## Migration Steps
1. **Research**: Check the documentation of the alternative package
2. **Test**: Create a feature branch and implement the alternative
3. **Update**: Replace imports and update usage patterns
4. **Verify**: Run your tests to ensure everything works
5. **Deploy**: Merge changes after thorough testing

` : `
## No Alternatives Found
No specific alternative packages are available in our database for ${packageName}.

## General Recommendations
1. Search npm for similar packages: https://www.npmjs.com/search?q=${encodeURIComponent(packageName)}
2. Check GitHub for forks or maintained alternatives
3. Consider building a custom solution if the package is simple
4. Look for packages with similar functionality but different approaches
`}

For detailed migration guidance and code examples, visit: http://127.0.0.1:5000`
            }
          ]
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message;
      throw new McpError(
        ErrorCode.InternalError,
        `API request failed (${status}): ${message}`
      );
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'depguard://api/schema',
        name: 'API Schema',
        description: 'DepGuard API schema and endpoint documentation',
        mimeType: 'application/json'
      },
      {
        uri: 'depguard://examples/package-analysis',
        name: 'Package Analysis Examples',
        description: 'Example responses from package vulnerability analysis',
        mimeType: 'application/json'
      }
    ]
  };
});

// Handle resource reads
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  switch (uri) {
    case 'depguard://api/schema':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              endpoints: {
                'POST /api/analyze': {
                  description: 'Analyze a project ZIP file for vulnerabilities',
                  parameters: {
                    projectZip: 'multipart/form-data - ZIP file containing project',
                    skipCodeAnalysis: 'boolean - Skip AST code analysis'
                  },
                  response: 'Analysis results with vulnerabilities, metrics, and AI suggestions'
                },
                'POST /api/analyze-json': {
                  description: 'Analyze package.json content for vulnerabilities',
                  parameters: {
                    packageJsonContent: 'string - Content of package.json file',
                    projectName: 'string - Optional project name'
                  },
                  response: 'Vulnerability analysis results'
                },
                'GET /api/analysis/:sessionId': {
                  description: 'Retrieve analysis results by session ID',
                  parameters: {
                    sessionId: 'string - Session ID from previous analysis'
                  },
                  response: 'Complete analysis results'
                },
                'GET /api/package-details/:packageName': {
                  description: 'Get detailed package information',
                  parameters: {
                    packageName: 'string - NPM package name'
                  },
                  response: 'Package details including maintenance status and recommendations'
                }
              }
            }, null, 2)
          }
        ]
      };
    
    case 'depguard://examples/package-analysis':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              example_response: {
                sessionId: 'session-1234567890',
                vulnerabilities: [
                  {
                    id: 'GHSA-example',
                    package: 'lodash',
                    version: '<=4.17.20',
                    severity: 'moderate',
                    description: 'Regular Expression Denial of Service (ReDoS)',
                    cvss: 5.3,
                    fixedIn: '4.17.21',
                    usageAnalysis: {
                      filesAffected: 3,
                      methodsUsed: ['get', 'pick', 'merge'],
                      migrationRisk: 'medium'
                    }
                  }
                ],
                metrics: {
                  critical: 0,
                  high: 1,
                  moderate: 2,
                  low: 0,
                  total: 3
                },
                securityScore: 75,
                aiSuggestions: [
                  {
                    package: 'lodash',
                    recommendation: 'Update to latest version',
                    complexity: 'low',
                    estimatedTime: '30 minutes'
                  }
                ]
              }
            }, null, 2)
          }
        ]
      };
    
    default:
      throw new McpError(ErrorCode.InvalidParams, `Resource not found: ${uri}`);
  }
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'security_audit_report',
        description: 'Generate a comprehensive security audit report from vulnerability analysis results'
      },
      {
        name: 'migration_plan',
        description: 'Create a step-by-step migration plan based on vulnerability analysis'
      },
      {
        name: 'risk_assessment',
        description: 'Assess security risks and provide prioritized recommendations'
      }
    ]
  };
});

// Handle prompt requests
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'security_audit_report':
      return {
        description: 'Generate a comprehensive security audit report',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Based on the vulnerability analysis results provided, create a comprehensive security audit report that includes:

1. Executive Summary of security status
2. Critical vulnerabilities requiring immediate attention
3. Risk assessment and impact analysis
4. Detailed findings with CVE information
5. Recommended remediation steps
6. Migration timeline and effort estimation

Please structure the report professionally and include specific technical details about each vulnerability, affected code files, and migration complexity.

Analysis Results: ${args?.analysisResults || '[Please provide analysis results from analyze_package_json or analyze_project_zip tools]'}`
            }
          }
        ]
      };
    
    case 'migration_plan':
      return {
        description: 'Create a step-by-step migration plan',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Create a detailed migration plan based on the vulnerability analysis results. The plan should include:

1. Pre-migration checklist and preparation steps
2. Prioritized list of packages to update/replace
3. Step-by-step migration instructions for each vulnerable package
4. Code changes required based on AST analysis
5. Testing strategy and validation steps
6. Rollback procedures
7. Timeline with estimated effort for each step

Focus on practical, actionable steps that developers can follow safely.

Analysis Results: ${args?.analysisResults || '[Please provide analysis results from analyze_package_json or analyze_project_zip tools]'}`
            }
          }
        ]
      };
    
    case 'risk_assessment':
      return {
        description: 'Assess security risks and provide prioritized recommendations',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Perform a detailed risk assessment based on the vulnerability analysis results. Include:

1. Risk matrix categorizing vulnerabilities by severity and exploitability
2. Business impact analysis for each vulnerability
3. Attack vectors and potential exploitation scenarios
4. Prioritized remediation recommendations
5. Short-term mitigation strategies
6. Long-term security improvement suggestions
7. Compliance considerations (if applicable)

Provide specific risk scores and justifications for prioritization decisions.

Analysis Results: ${args?.analysisResults || '[Please provide analysis results from analyze_package_json or analyze_project_zip tools]'}`
            }
          }
        ]
      };
    
    default:
      throw new McpError(ErrorCode.InvalidParams, `Prompt not found: ${name}`);
  }
});

// Start the server
async function main() {
  console.error('Starting DepGuard MCP Server...');
  console.error(`API Base URL: ${DEPGUARD_API_BASE}`);
  
  // Validate API connection
  const isConnected = await validateApiConnection();
  if (!isConnected) {
    console.error('WARNING: Cannot connect to DepGuard API. Please ensure:');
    console.error('1. DepGuard API server is running on port 5000');
    console.error('2. DEPGUARD_API_URL environment variable is correct');
    console.error('3. No firewall blocking the connection');
  } else {
    console.error('✓ Successfully connected to DepGuard API');
  }
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server ready and listening...');
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down MCP Server...');
    await server.close();
    process.exit(0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Server failed to start:', error);
    process.exit(1);
  });
}

export { server };