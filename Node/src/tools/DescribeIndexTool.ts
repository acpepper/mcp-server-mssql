import sql from "mssql";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export class DescribeIndexTool implements Tool {
  [key: string]: any;
  name = "describe_index";
  description = "Describes the indexes (including primary keys, unique constraints, and regular indexes) for a specified MSSQL Database table.";
  inputSchema = {
    type: "object",
    properties: {
      tableName: {
        type: "string",
        description: "Name of the table to describe indexes for"
      },
      schemaName: {
        type: "string",
        description: "Name of the schema containing the table (optional, defaults to 'dbo')",
        default: "dbo"
      },
    },
    required: ["tableName"],
  } as any;

  async run(params: { tableName: string; schemaName?: string }) {
    try {
      const { tableName, schemaName = "dbo" } = params;
      const request = new sql.Request();

      // Query to get comprehensive index information
      const query = `
        SELECT
          i.name AS index_name,
          i.type_desc AS index_type,
          i.is_unique AS is_unique,
          i.is_primary_key AS is_primary_key,
          i.is_unique_constraint AS is_unique_constraint,
          c.name AS column_name,
          ic.key_ordinal AS column_order,
          ic.is_descending_key AS is_descending,
          ic.is_included_column AS is_included_column,
          ds.name AS data_space_name,
          i.fill_factor AS fill_factor,
          i.is_disabled AS is_disabled,
          i.is_hypothetical AS is_hypothetical
        FROM sys.indexes i
        INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
        INNER JOIN sys.tables t ON i.object_id = t.object_id
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        LEFT JOIN sys.data_spaces ds ON i.data_space_id = ds.data_space_id
        WHERE s.name = @schemaName
          AND t.name = @tableName
          AND i.index_id > 0  -- Exclude heap (index_id = 0)
        ORDER BY i.name, ic.key_ordinal, ic.is_included_column DESC
      `;

      request.input("schemaName", sql.NVarChar, schemaName);
      request.input("tableName", sql.NVarChar, tableName);
      const result = await request.query(query);

      // Group the results by index name for better organization
      const indexesMap = new Map();

      result.recordset.forEach((row: any) => {
        const indexName = row.index_name;

        if (!indexesMap.has(indexName)) {
          indexesMap.set(indexName, {
            index_name: row.index_name,
            index_type: row.index_type,
            is_unique: row.is_unique,
            is_primary_key: row.is_primary_key,
            is_unique_constraint: row.is_unique_constraint,
            data_space_name: row.data_space_name,
            fill_factor: row.fill_factor,
            is_disabled: row.is_disabled,
            is_hypothetical: row.is_hypothetical,
            columns: [],
            included_columns: []
          });
        }

        const index = indexesMap.get(indexName);

        if (row.is_included_column) {
          index.included_columns.push({
            column_name: row.column_name,
            is_descending: row.is_descending
          });
        } else {
          index.columns.push({
            column_name: row.column_name,
            column_order: row.column_order,
            is_descending: row.is_descending
          });
        }
      });

      const indexes = Array.from(indexesMap.values());

      return {
        success: true,
        message: `Found ${indexes.length} index(es) for table ${schemaName}.${tableName}`,
        table_name: tableName,
        schema_name: schemaName,
        indexes: indexes,
        index_count: indexes.length
      };

    } catch (error) {
      console.error("Error describing indexes:", error);
      return {
        success: false,
        message: `Failed to describe indexes: ${error}`,
      };
    }
  }
}
