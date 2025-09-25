# MSSQL Database MCP  Server

<div align="center">
  <img src="./src/img/logo.png" alt="MSSQL Database MCP server logo" width="400"/>
</div>

## What is this? 🤔

This is a server that lets your LLMs (like Claude) talk directly to your MSSQL Database data! Think of it as a friendly translator that sits between your AI assistant and your database, making sure they can chat securely and efficiently.

### Quick Example
```text
You: "Show me all customers from New York"
Claude: *queries your MSSQL Database database and gives you the answer in plain English*
```

## How Does It Work? 🛠️

This server leverages the Model Context Protocol (MCP), a versatile framework that acts as a universal translator between AI models and databases. It supports multiple AI assistants including Claude Desktop and VS Code Agent.

### What Can It Do? 📊

- Run MSSQL Database queries by just asking questions in plain English
- Create, read, update, and delete data
- Manage database schema (tables, indexes)
- Secure connection handling
- Real-time data interaction

## Quick Start 🚀

### Prerequisites
- Node.js 14 or higher
- Claude Desktop or VS Code with Agent extension

### Set up project

1. **Install Dependencies**
   Run the following command in the root folder to install all necessary dependencies:
   ```bash
   npm install
   ```

2. **Build the Project**
   Compile the project by running:
   ```bash
   npm run build
   ```

## Configuration Setup

### Option 1: VS Code Agent Setup

1. **Install VS Code Agent Extension**
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Search for "Agent" and install the official Agent extension

2. **Create MCP Configuration File**
   - Create a `.vscode/mcp.json` file in your workspace
   - Add the following configuration:

   ```json
   {
     "servers": {
       "mssql-nodejs": {
          "type": "stdio",
          "command": "node",
          "args": ["q:\\Repos\\SQL-AI-samples\\MssqlMcp\\Node\\dist\\index.js"],
          "env": {
            "DATABASE_URL": "mssql://username:password@your-server:1433/your-database",
            "READONLY": "false",
            "TOOL_PREFIX": "mssql"
          }
        }
      }
   }
   ```

3. **Alternative: User Settings Configuration**
   - Open VS Code Settings (Ctrl+,)
   - Search for "mcp"
   - Click "Edit in settings.json"
   - Add the following configuration:

  ```json
   {
    "mcp": {
        "servers": {
            "mssql": {
                "command": "node",
                "args": ["C:/path/to/your/Node/dist/index.js"],
                "env": {
                  "DATABASE_URL": "mssql://username:password@your-server:1433/your-database",
                  "READONLY": "false",
                  "TOOL_PREFIX": "mssql"
                }
            }
        }
    }
  }
  ```

4. **Restart VS Code**
   - Close and reopen VS Code for the changes to take effect

5. **Verify MCP Server**
   - Open Command Palette (Ctrl+Shift+P)
   - Run "MCP: List Servers" to verify your server is configured
   - You should see "mssql" in the list of available servers

### Option 2: Claude Desktop Setup

1. **Open Claude Desktop Settings**
   - Navigate to File → Settings → Developer → Edit Config
   - Open the `claude_desktop_config` file

2. **Add MCP Server Configuration**
   Replace the content with the configuration below, updating the path and credentials:

   ```json
   {
     "mcpServers": {
       "mssql": {
         "command": "node",
         "args": ["C:/path/to/your/Node/dist/index.js"],
         "env": {
           "DATABASE_URL": "mssql://username:password@your-server:1433/your-database",
           "READONLY": "false",
           "TOOL_PREFIX": "mssql"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop**
   - Close and reopen Claude Desktop for the changes to take effect

### Configuration Parameters

You can configure the connection using either a single `DATABASE_URL` or individual environment variables:

**Option 1: Using DATABASE_URL (Recommended)**
- **DATABASE_URL**: Complete connection string in format `mssql://username:password@server:port/database`

**Option 2: Using Individual Variables**
- **SERVER_NAME**: Your MSSQL Database server name (e.g., `my-server.database.windows.net` or `localhost`)
- **DATABASE_NAME**: Your database name
- **SQL_USER**: Your SQL Server username
- **SQL_PASSWORD**: Your SQL Server password

**Additional Configuration:**
- **READONLY**: Set to `"true"` to restrict to read-only operations, `"false"` for full access
- **Path**: Update the path in `args` to point to your actual project location.
- **CONNECTION_TIMEOUT**: (Optional) Connection timeout in seconds. Defaults to `30` if not set.
- **TRUST_SERVER_CERTIFICATE**: (Optional) Set to `"true"` to trust self-signed server certificates (useful for development or when connecting to servers with self-signed certs). Defaults to `"false"`.
- **TOOL_PREFIX**: (Optional) Add a prefix to all tool names. For example, setting `TOOL_PREFIX=mssql` will rename tools from `read_data` to `mssql_read_data`. Useful when running multiple MCP servers to avoid naming conflicts.
- **NOLOCK Optimization**: When `READONLY=true`, all SELECT queries automatically include `WITH (NOLOCK)` hints to improve performance by avoiding shared locks. This is safe for read-only operations and can significantly improve query performance in busy databases.

## Sample Configurations

You can find sample configuration files in the project root:
- `sql-auth-config-example.json` - Using DATABASE_URL format
- `sql-auth-config-individual.json` - Using individual environment variables

You can also find additional sample configuration files in the `src/samples/` folder:
- `claude_desktop_config.json` - For Claude Desktop
- `vscode_agent_config.json` - For VS Code Agent

## Usage Examples

Once configured, you can interact with your database using natural language:

- "Show me all users from New York"
- "Create a new table called products with columns for id, name, and price"
- "Update all pending orders to completed status"
- "List all tables in the database"

## Security Notes

- The server requires a WHERE clause for read operations to prevent accidental full table scans
- Update operations require explicit WHERE clauses for security
- Set `READONLY: "true"` in production environments if you only need read access
- When `READONLY=true`, queries use `WITH (NOLOCK)` hints for better performance. This is safe for read-only operations but means queries may read uncommitted data

You should now have successfully configured the MCP server for MSSQL Database with your preferred AI assistant. This setup allows you to seamlessly interact with MSSQL Database through natural language queries!
