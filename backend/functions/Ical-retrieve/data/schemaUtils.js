export const quoteIdentifier = (identifier) => `"${String(identifier).replaceAll('"', '""')}"`;

export const isValidSchemaName = (value) =>
  typeof value === "string" && /^[A-Za-z_]\w*$/.test(value.trim());

export const resolveSchemaName = (client) => {
  if (process.env.TEST === "true") {
    return "test";
  }

  const schema = client?.options?.schema;
  if (isValidSchemaName(schema)) {
    const normalized = schema.trim().toLowerCase();
    if (normalized === "public") {
      return "main";
    }
    return normalized;
  }

  return "main";
};

export const resolveQualifiedTableName = (client, tableName) => {
  const schemaName = resolveSchemaName(client);
  if (!schemaName) {
    return tableName;
  }
  return `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;
};
