# Spec

- Allow defining DATABASE_URL through MCP env configuration
- Query mssql data through tool
  - By default, make it readonly
  - Allow write ops by setting ENV `DANGEROUSLY_ALLOW_WRITE_OPS=true|1`
- Access tables as `resources`
