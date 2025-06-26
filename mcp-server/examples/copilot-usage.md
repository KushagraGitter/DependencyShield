# GitHub Copilot Usage Examples

## Setup Instructions

1. **Build the MCP Server**
```bash
cd mcp-server
npm install
npm run build
```

2. **Configure GitHub Copilot**
Add to your MCP configuration file (`~/.mcpconfig.json`):
```json
{
  "mcpServers": {
    "depguard": {
      "command": "node",
      "args": ["/absolute/path/to/your/project/mcp-server/dist/index.js"],
      "env": {
        "DEPGUARD_API_URL": "http://localhost:5000"
      }
    }
  }
}
```

3. **Start DepGuard API Server**
```bash
npm run dev  # From main project directory
```

## Usage Examples in Your IDE

### Basic Vulnerability Analysis
```
@depguard analyze this package.json for security vulnerabilities:
{
  "name": "my-app",
  "dependencies": {
    "lodash": "4.17.19",
    "express": "4.17.1",
    "axios": "0.21.0"
  }
}
```

### Complete Project Analysis
```
@depguard analyze my project ZIP file at /path/to/my-project.zip with full code analysis
```

### Generate Security Report
```
@depguard create a comprehensive security audit report based on the vulnerability analysis results from session-123456
```

### Create Migration Plan
```
@depguard generate a step-by-step migration plan to fix all vulnerabilities found in my analysis
```

### Risk Assessment
```
@depguard perform a detailed risk assessment and prioritize the vulnerabilities by business impact
```

### Package-Specific Analysis
```
@depguard get detailed information about the lodash package including maintenance status and upgrade recommendations
```

## Advanced Workflows

### Security Code Review
```
I need to review this package.json for security issues before deployment:

{
  "dependencies": {
    "express": "4.17.1",
    "lodash": "4.17.19", 
    "moment": "2.29.1",
    "axios": "0.21.0"
  }
}

@depguard analyze_package_json and then create a security audit report with risk assessment
```

### Migration Planning
```
@depguard analyze my project and create a detailed migration plan that includes:
1. Priority order for fixing vulnerabilities
2. Estimated time for each package update
3. Breaking changes to watch out for
4. Code changes needed based on usage analysis
```

### Continuous Monitoring Setup
```
@depguard help me set up continuous security monitoring for my project that will:
1. Check for new vulnerabilities weekly
2. Generate automated security reports
3. Create migration plans for critical issues
```

## Response Format

All DepGuard tools return structured JSON data including:

- **Vulnerabilities**: Detailed CVE information with CVSS scores
- **Usage Analysis**: File-level impact showing exactly where packages are used
- **AI Suggestions**: Smart migration recommendations with complexity ratings
- **Release Comparison**: LLM-powered analysis of version differences
- **Security Metrics**: Overall security score and vulnerability breakdown

## Best Practices

1. **Always run full project analysis** for comprehensive results including AST parsing
2. **Use session IDs** to retrieve detailed results from previous analyses
3. **Generate reports** using the built-in prompts for professional documentation
4. **Follow migration plans** step-by-step for safe updates
5. **Regular monitoring** to catch new vulnerabilities early

## Troubleshooting

### MCP Server Not Found
- Ensure the path in mcpconfig.json is absolute
- Verify the MCP server is built (`npm run build`)
- Check that Node.js can execute the dist/index.js file

### API Connection Issues
- Verify DEPGUARD_API_URL points to running server (default: http://localhost:5000)
- Ensure the main DepGuard application is running (`npm run dev`)
- Check firewall/network settings

### Tool Execution Errors
- Validate input parameters match the expected schema
- Check file paths exist and are accessible
- Review error messages for specific API issues