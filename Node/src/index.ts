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
  return TOOL_PREFIX ? `${TOOL_PREFIX}_${baseName}` : baseName;
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
      trustServerCertificate
    },
    connectionTimeout: connectionTimeout * 1000, // convert seconds to milliseconds
  };

  // Add ApplicationIntent=ReadOnly when READONLY environment variable is set
  if (isReadOnly) {
    config.options = {
      ...config.options,
      useUTC: false,
      enableArithAbort: true
    };
    // Add ApplicationIntent to connection string via server property
    config.server = `${server};ApplicationIntent=ReadOnly`;
  }

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

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: isReadOnly
    ? [listTableTool, readDataTool, describeTableTool, describeIndexTool] // todo: add searchDataTool to the list of tools available in readonly mode once implemented
    : [insertDataTool, readDataTool, describeTableTool, describeIndexTool, updateDataTool, createTableTool, createIndexTool, dropTableTool, listTableTool], // add all new tools here
}));

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
    return {
      content: [{ type: "text", text: `Error occurred: ${error}` }],
      isError: true,
    };
  }
});

// Server startup
async function runServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("Fatal error running server:", error);
    process.exit(1);
  }
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});

// Connect to SQL only when handling a request

async function ensureSqlConnection() {
  // If we have a pool and it's connected, reuse it
  if (globalSqlPool && globalSqlPool.connected) {
    return;
  }

  // Otherwise, create a new connection
  const { config } = await createSqlConfig();

  // Close old pool if exists
  if (globalSqlPool && globalSqlPool.connected) {
    await globalSqlPool.close();
  }

  globalSqlPool = await sql.connect(config);
}

// Patch all tool handlers to ensure SQL connection before running
function wrapToolRun(tool: { run: (...args: any[]) => Promise<any> }) {
  const originalRun = tool.run.bind(tool);
  tool.run = async function (...args: any[]) {
    await ensureSqlConnection();
    return originalRun(...args);
  };
}

[insertDataTool, readDataTool, updateDataTool, createTableTool, createIndexTool, dropTableTool, listTableTool, describeTableTool, describeIndexTool].forEach(wrapToolRun);