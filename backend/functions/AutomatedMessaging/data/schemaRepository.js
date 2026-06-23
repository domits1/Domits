import Database from "../.shared/integrations/ORM/index.js";

export default class SchemaRepository {
  async inspect() {
    const client = await Database.getInstance();
    const schema = client?.options?.schema || "main";
    return client.query(
      `SELECT 'column' AS kind, table_name AS object_name, column_name AS member_name
         FROM information_schema.columns
        WHERE table_schema = $1
       UNION ALL
       SELECT 'index' AS kind, tablename AS object_name, indexname AS member_name
         FROM pg_indexes
        WHERE schemaname = $1`,
      [schema]
    );
  }
}
