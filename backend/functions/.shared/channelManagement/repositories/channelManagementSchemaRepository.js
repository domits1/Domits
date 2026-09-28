import Database from "../../integrations/ORM/index.js";

// Indexes come from pg_index rather than pg_indexes: an index built with ASYNC is
// listed as soon as it is created, but is only usable once indisvalid is true.
export default class ChannelManagementSchemaRepository {
  async inspect() {
    const client = await Database.getInstance();
    const schema = client?.options?.schema || "main";
    return client.query(
      `SELECT 'column' AS kind, table_name AS object_name, column_name AS member_name
         FROM information_schema.columns
        WHERE table_schema = $1
       UNION ALL
       SELECT 'index' AS kind, t.relname AS object_name, c.relname AS member_name
         FROM pg_index x
         JOIN pg_class c ON c.oid = x.indexrelid
         JOIN pg_class t ON t.oid = x.indrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1
          AND x.indisvalid`,
      [schema]
    );
  }
}
