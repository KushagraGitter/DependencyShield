#!/bin/bash

echo "🚀 Starting DepGuard MCP Server..."

# Check if main API is running
echo "Checking DepGuard API connection..."
if curl -s http://127.0.0.1:5000/api/health > /dev/null; then
    echo "✓ DepGuard API is running on port 5000"
else
    echo "❌ DepGuard API is not accessible on port 5000"
    echo "Please start the main application first: npm run dev"
    exit 1
fi

# Build MCP server if needed
if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
    echo "Building MCP server..."
    npm run build
fi

# Set environment variables - use IPv4 address to avoid IPv6 issues
export DEPGUARD_API_URL="http://127.0.0.1:5000"

echo "Starting MCP server with API URL: $DEPGUARD_API_URL"
echo "Use Ctrl+C to stop the server"
echo ""
echo "Test the server first:"
echo "node test-connection.js"
echo ""

# Start the MCP server
node dist/index.js