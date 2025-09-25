#!/usr/bin/env node

// External imports
import * as dotenv from "dotenv";
import sql from "mssql";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Load environment variables
dotenv.config();

// Get tool prefix from environment variable
const TOOL_PREFIX = process.env.TOOL_PREFIX || "";

// Utility function to create prefixed tool name
export function createToolName(baseName: string): string {
  const prefixedName = TOOL_PREFIX ? `${TOOL_PREFIX}_${baseName}` : baseName;
  // Note: Cannot use console.log in MCP servers as it interferes with STDIO protocol
  return prefixedName;
}

// Internal imports
import { UpdateDataTool } from "./tools/UpdateDataTool.js";
import { InsertDataTool } from "./tools/InsertDataTool.js";
import { ReadDataTool } from "./tools/ReadDataTool.js";
import { CreateTableTool } from "./tools/CreateTableTool.js";
import { CreateIndexTool } from "./tools/CreateIndexTool.js";
import { ListTableTool } from "./tools/ListTableTool.js";
import { DropTableTool } from "./tools/DropTableTool.js";
// Removed Azure AD imports - using SQL Server authentication instead
import { DescribeTableTool } from "./tools/DescribeTableTool.js";
import { DescribeIndexTool } from "./tools/DescribeIndexTool.js";

// MSSQL Database connection configuration
// const credential = new DefaultAzureCredential();

// Globals for connection reuse
let globalSqlPool: sql.ConnectionPool | null = null;
let connectionRetryCount = 0;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

// Function to create SQL config with SQL Server authentication
export async function createSqlConfig(): Promise<{ config: sql.config }> {
  const trustServerCertificate = process.env.TRUST_SERVER_CERTIFICATE?.toLowerCase() === 'true';
  const connectionTimeout = process.env.CONNECTION_TIMEOUT ? parseInt(process.env.CONNECTION_TIMEOUT, 10) : 30;
  const isReadOnly = process.env.READONLY === "true";

  // Support both individual credentials and DATABASE_URL
  let server, database, user, password;

  if (process.env.DATABASE_URL) {
    // Parse DATABASE_URL format: mssql://user:password@server:port/database
    const url = new URL(process.env.DATABASE_URL);
    server = url.hostname;
    if (url.port) {
      server += `:${url.port}`;
    }
    database = url.pathname.substring(1); // Remove leading slash
    user = url.username;
    password = url.password;
  } else {
    // Use individual environment variables
    server = process.env.SERVER_NAME!;
    database = process.env.DATABASE_NAME!;
    user = process.env.SQL_USER!;
    password = process.env.SQL_PASSWORD!;
  }

  const config: sql.config = {
    server: server,
    database: database,
    user: user,
    password: password,
    options: {
      encrypt: true,
      trustServerCertificate,
      enableArithAbort: true,
      useUTC: false,
      requestTimeout: 30000, // 30 seconds for individual requests
    },
    connectionTimeout: connectionTimeout * 1000, // convert seconds to milliseconds
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
    },
  };

  return { config };
}

// Read READONLY env variable
const isReadOnly = process.env.READONLY === "true";

// Create tool instances and set prefixed names
const updateDataTool = new UpdateDataTool();
updateDataTool.name = createToolName("update_data");

const insertDataTool = new InsertDataTool();
insertDataTool.name = createToolName("insert_data");

const readDataTool = new ReadDataTool();
readDataTool.name = createToolName("read_data");
readDataTool.isReadOnly = isReadOnly;

const createTableTool = new CreateTableTool();
createTableTool.name = createToolName("create_table");

const createIndexTool = new CreateIndexTool();
createIndexTool.name = createToolName("create_index");

const listTableTool = new ListTableTool();
listTableTool.name = createToolName("list_table");
listTableTool.isReadOnly = isReadOnly;

const dropTableTool = new DropTableTool();
dropTableTool.name = createToolName("drop_table");

const describeTableTool = new DescribeTableTool();
describeTableTool.name = createToolName("describe_table");
describeTableTool.isReadOnly = isReadOnly;

const describeIndexTool = new DescribeIndexTool();
describeIndexTool.name = createToolName("describe_index");
describeIndexTool.isReadOnly = isReadOnly;

const server = new Server(
  {
    name: "mssql-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Request handlers

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = isReadOnly
    ? [listTableTool, readDataTool, describeTableTool, describeIndexTool] // todo: add searchDataTool to the list of tools available in readonly mode once implemented
    : [insertDataTool, readDataTool, describeTableTool, describeIndexTool, updateDataTool, createTableTool, createIndexTool, dropTableTool, listTableTool]; // add all new tools here

  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case insertDataTool.name:
        result = await insertDataTool.run(args);
        break;
      case readDataTool.name:
        result = await readDataTool.run(args);
        break;
      case updateDataTool.name:
        result = await updateDataTool.run(args);
        break;
      case createTableTool.name:
        result = await createTableTool.run(args);
        break;
      case createIndexTool.name:
        result = await createIndexTool.run(args);
        break;
      case listTableTool.name:
        result = await listTableTool.run(args);
        break;
      case dropTableTool.name:
        result = await dropTableTool.run(args);
        break;
      case describeTableTool.name:
        if (!args || typeof args.tableName !== "string") {
          return {
            content: [{ type: "text", text: `Missing or invalid 'tableName' argument for ${describeTableTool.name} tool.` }],
            isError: true,
          };
        }
        result = await describeTableTool.run(args as { tableName: string });
        break;
      case describeIndexTool.name:
        if (!args || typeof args.tableName !== "string") {
          return {
            content: [{ type: "text", text: `Missing or invalid 'tableName' argument for ${describeIndexTool.name} tool.` }],
            isError: true,
          };
        }
        result = await describeIndexTool.run(args as { tableName: string; schemaName?: string });
        break;
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };

  } catch (error) {
    // Note: Cannot use console.error in MCP servers as it interferes with STDIO protocol

    // Provide more detailed error information
    let errorMessage = `Error occurred in tool ${name}: ${error}`;
    const errorStr = String(error);

    // Add specific error context
    if (errorStr.includes('connection')) {
      errorMessage += '\n\nThis appears to be a database connection issue. Please check:';
      errorMessage += '\n- Database server is running and accessible';
      errorMessage += '\n- Network connectivity to the database';
      errorMessage += '\n- Credentials are correct';
      errorMessage += '\n- Database name exists';
    } else if (errorStr.includes('timeout')) {
      errorMessage += '\n\nThis appears to be a timeout issue. The operation took too long to complete.';
    } else if (errorStr.includes('permission') || errorStr.includes('denied')) {
      errorMessage += '\n\nThis appears to be a permission issue. Please check database user permissions.';
    }

    return {
      content: [{ type: "text", text: errorMessage }],
      isError: true,
    };
  }
});

// Graceful shutdown handler
async function gracefulShutdown() {
  if (globalSqlPool) {
    try {
      await globalSqlPool.close();
    } catch (error) {
      // Silently handle shutdown errors
    }
  }

  process.exit(0);
}

// Handle process termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // For nodemon restart

// Server startup
async function runServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    process.exit(1);
  }
}

runServer().catch((error) => {
  process.exit(1);
});

// Health check function to verify connection is working
async function isConnectionHealthy(): Promise<boolean> {
  try {
    if (!globalSqlPool || !globalSqlPool.connected) {
      return false;
    }

    // Test the connection with a simple query
    const result = await globalSqlPool.request().query('SELECT 1 as test');
    return result.recordset && result.recordset.length > 0;
  } catch (error) {
    // Connection health check failed - return false silently
    return false;
  }
}

// Enhanced connection function with retry logic and health checks
async function ensureSqlConnection(): Promise<void> {
  // If we have a healthy connection, reuse it
  if (await isConnectionHealthy()) {
    connectionRetryCount = 0; // Reset retry count on successful connection
    return;
  }

  // Close old pool if it exists
  if (globalSqlPool) {
    try {
      await globalSqlPool.close();
    } catch (error) {
      // Silently handle pool closure errors
    }
    globalSqlPool = null;
  }

  // Attempt connection with retry logic
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const { config } = await createSqlConfig();
      globalSqlPool = await sql.connect(config);

      // Verify the connection is actually working
      if (await isConnectionHealthy()) {
        connectionRetryCount = 0;
        return;
      } else {
        throw new Error('Connection established but health check failed');
      }

    } catch (error) {
      if (attempt === MAX_RETRY_ATTEMPTS) {
        connectionRetryCount = attempt;
        throw new Error(`Failed to establish SQL connection after ${MAX_RETRY_ATTEMPTS} attempts. Last error: ${error}`);
      }

      // Exponential backoff delay
      const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Patch all tool handlers to ensure SQL connection before running with enhanced error handling
function wrapToolRun(tool: { run: (...args: any[]) => Promise<any> }) {
  const originalRun = tool.run.bind(tool);
  tool.run = async function (...args: any[]) {
    try {
      await ensureSqlConnection();
      return await originalRun(...args);
    } catch (error) {
      // If it's a connection error, try to reconnect once more
      const errorStr = String(error);
      if (errorStr.includes('connection')) {
        try {
          globalSqlPool = null; // Force reconnection
          await ensureSqlConnection();
          return await originalRun(...args);
        } catch (retryError) {
          throw new Error(`Database connection failed: ${retryError}`);
        }
      }

      throw error;
    }
  };
}

[insertDataTool, readDataTool, updateDataTool, createTableTool, createIndexTool, dropTableTool, listTableTool, describeTableTool, describeIndexTool].forEach(wrapToolRun);