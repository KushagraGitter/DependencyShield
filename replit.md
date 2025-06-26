# DepGuard AI - Intelligent NPM Vulnerability Analysis

## Project Overview
DepGuard AI is an intelligent NPM vulnerability analysis and migration assistance tool powered by AI. The application analyzes package.json files for security vulnerabilities, provides AI-powered migration suggestions using OpenAI, performs AST parsing for deep code analysis, tracks CVE information, and generates automated migration code.

## Current Features
- ZIP file upload support for project analysis
- Comprehensive vulnerability detection using npm audit
- AST parsing for deep code analysis showing actual file usage
- AI-powered migration suggestions using OpenAI GPT-4o
- LLM-powered release notes comparison between vulnerable and recommended versions
- File-level impact analysis showing exact code instances where packages are used
- **Enhanced CVE tracking and detailed vulnerability information**
- Multi-source CVE data aggregation (NVD, GitHub Advisory, MITRE)
- EPSS (Exploit Prediction Scoring System) integration
- CISA Known Exploited Vulnerabilities tracking
- Comprehensive risk scoring and priority assessment
- Threat intelligence integration
- **Deprecated package detection with alternative package suggestions**
- Alternative package recommendations with migration guidance
- Real-time analysis progress tracking
- Comprehensive vulnerability details modal with tabbed CVE interface

## Recent Changes
- **2025-06-25**: Implemented deprecated package detection and alternative package suggestions system
- **2025-06-25**: Created comprehensive alternative packages mapping with 70+ deprecated package replacements
- **2025-06-25**: Added AlternativePackagesCard component with migration guidance and installation commands
- **2025-06-25**: Enhanced package details API to include deprecation status and alternative recommendations
- **2025-06-25**: Fixed vulnerable methods section to properly clear data when switching between vulnerabilities
- **2025-06-25**: Implemented comprehensive CVE tracking and detailed vulnerability information system
- **2025-06-25**: Added multi-source CVE data aggregation from NVD, GitHub Advisory, and MITRE databases
- **2025-06-25**: Integrated EPSS scoring and CISA KEV tracking for enhanced threat assessment
- **2025-06-25**: Created dedicated CVE details tab in vulnerability modal with comprehensive risk scoring
- **2025-06-25**: Created comprehensive feature documentation covering complete project architecture
- **2025-06-25**: Documented all frontend, backend, MCP server, and integration capabilities
- **2025-06-25**: Fixed IPv6/IPv4 connection issues in MCP server - now uses 127.0.0.1 instead of localhost

## Architecture
- **Frontend**: React with TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (currently using in-memory storage)
- **AI Integration**: OpenAI GPT-4o for migration analysis and release notes comparison
- **File Processing**: ZIP file upload with AST parsing for JavaScript/TypeScript
- **Vulnerability Data**: npm audit, CVE databases, GitHub Security Advisory API
- **MCP Server**: Model Context Protocol server for GitHub Copilot integration

## Key Services
- **AST Analysis**: Parses JavaScript/TypeScript files to track package usage
- **Vulnerability Enrichment**: Enriches vulnerabilities with CVE details
- **Release Notes Comparison**: AI-powered analysis of version differences
- **Migration Generator**: Generates automated migration suggestions
- **Code Analysis**: Analyzes actual code usage patterns
- **MCP Server**: Model Context Protocol server for GitHub Copilot integration

## User Preferences
- Technical communication style preferred
- Focus on comprehensive security analysis
- Emphasis on actionable migration guidance
- Real-time feedback during analysis processes

## Deployment
- Uses Replit's built-in deployment system
- No Docker or containerization required
- Environment variables managed through Replit secrets