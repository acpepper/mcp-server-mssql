#!/bin/bash

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js could not be found. Please install Node.js first."
    exit 1
fi

# cd to the Node directory
echo "Changing to Node directory..."
cd ./Node

# rebuild the Node.js server
echo "Rebuilding Node.js server..."
npm run build

# Run the MCP Inspector with the Node.js server
echo "Running MCP Inspector with Node.js server..."
npx @modelcontextprotocol/inspector \
    -e SERVER_NAME="prod.db.skyslope.com" \
    -e DATABASE_NAME="Prod_SkySlope_Prime" \
    -e SQL_USER=$MSSQL_PROD_USER \
    -e SQL_PASSWORD=$MSSQL_PROD_PASSWORD \
    -e TOOL_PREFIX="prod" \
    -e READONLY="true" \
    -e TRUST_SERVER_CERTIFICATE="true" \
    node dist/index.js
