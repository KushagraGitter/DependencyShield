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
- CVE enrichment with detailed security information
- Real-time analysis progress tracking
- Comprehensive vulnerability details modal with tabbed interface

## Recent Changes
- **2025-06-25**: Fixed IPv6/IPv4 connection issues in MCP server - now uses 127.0.0.1 instead of localhost
- **2025-06-25**: Resolved ECONNREFUSED errors by correcting network configuration
- **2025-06-25**: Successfully built and tested MCP server for GitHub Copilot integration
- **2025-06-25**: Added health endpoint and connection validation to main API
- **2025-06-25**: Created comprehensive testing and setup scripts for MCP server
- **2025-06-25**: Added LLM-powered release notes comparison feature

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