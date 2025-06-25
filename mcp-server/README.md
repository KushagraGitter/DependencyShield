# DepGuard MCP Server

A Model Context Protocol (MCP) server that provides access to DepGuard AI's vulnerability analysis and package security APIs. This allows GitHub Copilot and other MCP-compatible tools to integrate with DepGuard's security analysis capabilities.

## Features

### Tools
- **analyze_package_json**: Analyze package.json content for vulnerabilities
- **analyze_project_zip**: Complete project analysis including AST code analysis
- **get_vulnerability_details**: Retrieve detailed vulnerability information
- **get_package_details**: Get package maintenance status and recommendations

### Resources
- **API Schema**: Complete documentation of DepGuard API endpoints
- **Examples**: Sample responses and usage patterns

### Prompts
- **security_audit_report**: Generate comprehensive security audit reports
- **migration_plan**: Create step-by-step migration plans
- **risk_assessment**: Perform detailed security risk assessments

## Installation

1. Install dependencies:
```bash
cd mcp-server
npm install
```

2. Build the server:
```bash
npm run build
```

3. Set environment variables:
```bash
export DEPGUARD_API_URL=http://localhost:5000  # Your DepGuard API URL
```

## Usage with GitHub Copilot

### 1. Add to MCP Configuration

Add the DepGuard MCP server to your MCP configuration file (usually `~/.mcpconfig.json`):

```json
{
  "mcpServers": {
    "depguard": {
      "command": "node",
      "args": ["/path/to/depguard-mcp-server/dist/index.js"],
      "env": {
        "DEPGUARD_API_URL": "http://localhost:5000"
      }
    }
  }
}
```

### 2. Using with GitHub Copilot

Once configured, you can use DepGuard functionality directly in your IDE:

```
@depguard analyze this package.json for vulnerabilities

@depguard create a security audit report for my project

@depguard generate a migration plan to fix vulnerabilities
```

## API Examples

### Analyze Package.json Content
```typescript
// In your IDE with Copilot
const analysis = await depguard.analyze_package_json({
  packageJsonContent: `{
    "name": "my-project",
    "dependencies": {
      "lodash": "4.17.19",
      "express": "4.17.1"
    }
  }`,
  projectName: "My Project"
});
```

### Analyze Complete Project
```typescript
const projectAnalysis = await depguard.analyze_project_zip({
  zipFilePath: "/path/to/project.zip",
  includeCodeAnalysis: true
});
```

### Get Vulnerability Details
```typescript
const vulnerabilities = await depguard.get_vulnerability_details({
  sessionId: "session-1234567890",
  vulnerabilityId: "GHSA-example"
});
```

### Get Package Information
```typescript
const packageInfo = await depguard.get_package_details({
  packageName: "lodash",
  includeReleaseComparison: true
});
```

## Response Format

All tools return structured data that includes:

- **Vulnerabilities**: Detailed security vulnerability information
- **Metrics**: Security scores and vulnerability counts
- **AI Suggestions**: Intelligent migration recommendations
- **Usage Analysis**: File-level impact analysis from AST parsing
- **Release Comparison**: AI-powered version difference analysis

## Development

### Running in Development Mode
```bash
npm run dev
```

### Building for Production
```bash
npm run build
npm start
```

### Testing the Server
```bash
# Test with MCP inspector
npm run inspector
```

## Integration Examples

### Security Audit Workflow
1. Upload project ZIP or package.json
2. Get vulnerability analysis results
3. Generate security audit report using prompts
4. Create migration plan with prioritized steps
5. Implement fixes based on recommendations

### Continuous Security Monitoring
1. Integrate with CI/CD pipeline
2. Analyze dependencies on every commit
3. Generate security reports automatically
4. Alert on new vulnerabilities

## Environment Variables

- `DEPGUARD_API_URL`: Base URL for DepGuard API (default: http://localhost:5000)

## Error Handling

The MCP server includes comprehensive error handling for:
- Invalid API requests
- Network timeouts
- File system errors
- Malformed input data

All errors are returned with appropriate MCP error codes and descriptive messages.

## Security Considerations

- Never include API keys or sensitive data in logs
- Validate all input parameters before processing
- Use secure file handling for temporary files
- Implement proper cleanup of temporary resources

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details.