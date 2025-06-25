# DepGuard AI Documentation

Welcome to the DepGuard AI documentation. This directory contains comprehensive documentation for using the DepGuard AI vulnerability analysis and migration assistance platform.

## Documentation Files

### [API Documentation](./API_DOCUMENTATION.md)
Complete API reference with request/response examples for all DepGuard server endpoints:
- Health check and status monitoring
- Package.json vulnerability analysis
- Project ZIP upload and analysis
- Analysis result retrieval
- Package details and recommendations
- Vulnerability and CVE details
- Security advisories
- Error handling and status codes

### [API Examples](./EXAMPLES.md)
Practical examples and integration guides:
- Basic package analysis workflows
- Project ZIP upload examples
- Batch analysis and monitoring
- Client libraries (Node.js, Python)
- CI/CD integration patterns
- Health monitoring scripts

### [Complete Feature Documentation](./FEATURES.md)
Comprehensive feature overview covering the entire DepGuard AI platform:
- Frontend application capabilities and user experience
- Backend API features and technical architecture
- GitHub Copilot MCP server integration
- AI-powered analysis and migration assistance
- Security intelligence and compliance features
- Enterprise capabilities and deployment options
- Industry applications and use cases
- Product roadmap and future development

### [MCP Server Documentation](../mcp-server/README.md)
GitHub Copilot integration guide:
- Model Context Protocol (MCP) server setup
- Tool definitions and capabilities
- Integration with GitHub Copilot
- Configuration and troubleshooting

## Quick Start

1. **Start the DepGuard API Server**
   ```bash
   npm run dev
   ```

2. **Health Check**
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Analyze a Package**
   ```bash
   curl -X POST http://localhost:5000/api/analyze-json \
     -H "Content-Type: application/json" \
     -d '{"packageJson":"{\"dependencies\":{\"lodash\":\"4.17.19\"}}"}'
   ```

## API Endpoints Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Server health check |
| `/api/analyze-json` | POST | Analyze package.json content |
| `/api/analyze` | POST | Analyze ZIP file project |
| `/api/analysis/:sessionId` | GET | Get analysis results |
| `/api/package/:packageName` | GET | Get package details |
| `/api/vulnerabilities/package/:name` | GET | Package vulnerability data |

## Key Features

- **Full-Stack Platform**: Complete React frontend with Express.js backend
- **Vulnerability Detection**: Comprehensive npm audit-based vulnerability scanning
- **AST Analysis**: Deep code analysis to understand actual package usage
- **AI-Powered Insights**: OpenAI GPT-4o powered migration recommendations
- **CVE Enrichment**: Detailed CVE information and security metrics
- **Release Notes Comparison**: AI analysis of version differences
- **GitHub Copilot Integration**: MCP server for IDE integration
- **Real-time Processing**: Asynchronous analysis with progress tracking
- **Enterprise Features**: Compliance reporting, audit trails, role-based access

## Data Flow

1. **Input**: Package.json or ZIP file upload
2. **Analysis**: npm audit + AST parsing + CVE lookup
3. **AI Processing**: OpenAI analysis for migration suggestions
4. **Output**: Comprehensive vulnerability report with actionable recommendations

## Security Features

- File size limits (50MB for ZIP uploads)
- Input validation and sanitization
- Secure temporary file handling
- CVE database integration
- CVSS scoring and risk assessment

## Support

For issues and questions:
- Check the troubleshooting sections in individual documentation files
- Review error response codes in the API documentation
- Ensure all prerequisites are met (Node.js, npm, OpenAI API key)