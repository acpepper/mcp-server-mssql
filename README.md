# MSSQL MCP Server

A Model Context Protocol (MCP) server for Microsoft SQL Server databases, providing secure database operations through a standardized interface.

> **Note**: This project was created from the [Azure SQL AI Samples repository](https://github.com/Azure-Samples/SQL-AI-samples), specifically the `MssqlMcp/Node` implementation. The upstream sample was removed from that repository in June 2026 ([PR #96](https://github.com/Azure-Samples/SQL-AI-samples/pull/96), "Removed unsafe MCP sample"); this fork includes all upstream changes through the final version (Nov 2025), including the `SELECT ... INTO` security fix.

## Features

- **Secure Database Operations**: Execute SELECT queries with comprehensive security validation
- **Table Management**: List, describe, and manage database tables and indexes
- **Data Manipulation**: Insert, update, and query data with proper validation
- **Read-Only Mode**: Optional read-only mode for enhanced security
- **Connection Pooling**: Efficient database connection management with retry logic
- **SQL Injection Protection**: Advanced security measures to prevent malicious queries

## Available Tools

### Read Operations (Always Available)
- `list_table` - List tables in the database, optionally filtered by schema
- `read_data` - Execute SELECT queries with security validation
- `describe_table` - Get table schema information
- `describe_index` - Get index information for tables

### Write Operations (Requires `READONLY=false`)
- `insert_data` - Insert data into tables
- `update_data` - Update existing records
- `create_table` - Create new tables
- `create_index` - Create indexes on tables
- `drop_table` - Drop tables (use with caution)

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd mcp-server-mssql
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

### Environment Variables

The server supports both individual environment variables and a `DATABASE_URL` format:

#### Option 1: Individual Variables
```bash
SERVER_NAME=your-server.database.windows.net
DATABASE_NAME=your-database
SQL_USER=your-username
SQL_PASSWORD=your-password
READONLY=true
TRUST_SERVER_CERTIFICATE=true
CONNECTION_TIMEOUT=30
```

#### Option 2: DATABASE_URL Format
```bash
DATABASE_URL=mssql://username:password@server:1433/database
READONLY=true
TRUST_SERVER_CERTIFICATE=true
```

### Configuration Parameters

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SERVER_NAME` | SQL Server hostname | - | Yes* |
| `DATABASE_NAME` | Database name | - | Yes* |
| `SQL_USER` | Database username | - | Yes* |
| `SQL_PASSWORD` | Database password | - | Yes* |
| `DATABASE_URL` | Complete connection string | - | Yes* |
| `READONLY` | Enable read-only mode | `false` | No |
| `TRUST_SERVER_CERTIFICATE` | Trust server certificate | `false` | No |
| `CONNECTION_TIMEOUT` | Connection timeout (seconds) | `30` | No |
| `TOOL_PREFIX` | Prefix for tool names | `""` | No |

*Either individual variables or `DATABASE_URL` is required.

## Usage

### As an MCP Server

Configure the server in your MCP client (e.g., Claude Desktop, Cursor):

```json
{
  "mcpServers": {
    "mssql-server": {
      "command": "node",
      "args": ["/path/to/mcp-server-mssql/dist/index.js"],
      "env": {
        "DATABASE_URL": "mssql://username:password@server:1433/database",
        "READONLY": "true",
        "TRUST_SERVER_CERTIFICATE": "true"
      }
    }
  }
}
```

### Example Configuration Files

See the included sample configurations:
- `sql-auth-config-example.json` - Basic configuration example
- `sql-auth-config-individual.json` - Individual environment variables example

### Sample Configurations

#### Claude Desktop
```json
{
  "mcpServers": {
    "mssql-sql-auth": {
      "command": "node",
      "args": ["/path/to/mcp-server-mssql/dist/index.js"],
      "env": {
        "DATABASE_URL": "mssql://your-username:your-password@your-server:1433/your-database",
        "READONLY": "false",
        "TRUST_SERVER_CERTIFICATE": "true"
      }
    }
  }
}
```

#### Cursor
```json
{
  "mcpServers": {
    "mssql-sql-auth": {
      "command": "node",
      "args": ["/path/to/mcp-server-mssql/dist/index.js"],
      "env": {
        "DATABASE_URL": "mssql://your-username:your-password@your-server:1433/your-database",
        "READONLY": "false",
        "TRUST_SERVER_CERTIFICATE": "true"
      }
    }
  }
}
```

## Security Features

### Query Validation
- Only SELECT queries are allowed in read operations
- Comprehensive SQL injection protection
- Dangerous keyword detection
- Pattern-based malicious query detection
- Query length limits

### Connection Security
- Encrypted connections by default
- Configurable certificate trust
- Connection pooling with timeout management
- Automatic retry logic with exponential backoff

### Read-Only Mode
When `READONLY=true`:
- Only read operations are available
- NOLOCK hints are automatically added to queries
- Write operations are completely disabled

## Development

### Project Structure
```
src/
├── index.ts              # Main server implementation
├── tools/                # Tool implementations
│   ├── CreateIndexTool.ts
│   ├── CreateTableTool.ts
│   ├── DescribeIndexTool.ts
│   ├── DescribeTableTool.ts
│   ├── DropTableTool.ts
│   ├── InsertDataTool.ts
│   ├── ListTableTool.ts
│   ├── ReadDataTool.ts
│   └── UpdateDataTool.ts
└── samples/              # Configuration examples
    ├── claude_desktop_config.json
    ├── cursor_desktop_config.json
    └── vscode_agent_config.json
```

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run watch
```

### Testing
```bash
npm start
```

## Error Handling

The server provides comprehensive error handling:
- Connection errors with retry logic
- Query validation errors
- Permission errors
- Timeout handling
- Graceful shutdown on process termination

## Contributing

This project is based on the [Azure SQL AI Samples](https://github.com/Azure-Samples/SQL-AI-samples) repository. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Based on the [Azure SQL AI Samples](https://github.com/Azure-Samples/SQL-AI-samples) repository
- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- Uses the [mssql](https://github.com/tediousjs/node-mssql) library for SQL Server connectivity

## Support

For issues and questions:
1. Check the [Azure SQL AI Samples repository](https://github.com/Azure-Samples/SQL-AI-samples) for related issues
2. Create an issue in this repository
3. Review the [Model Context Protocol documentation](https://modelcontextprotocol.io/)

## Related Projects

- [Azure SQL AI Samples](https://github.com/Azure-Samples/SQL-AI-samples) - Original source repository
- [Model Context Protocol](https://modelcontextprotocol.io/) - Protocol specification
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - SDK used in this project