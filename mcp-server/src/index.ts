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

const server = new Server(
  {
    name: 'depguard-mcp-server',
    version: '1.0.0',
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