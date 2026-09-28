import Database from "../../../.shared/integrations/ORM/index.js";

export const NOW = 1_750_000_000_000;

// TypeORM's raw query returns the rows for a SELECT, but [rows, rowCount] for an
// UPDATE or DELETE (PostgresQueryRunner.query). The mock must do the same, or a
// repository that reads the wrong shape passes its tests and fails in production.
export const mockClient = (rows = []) => {
  const client = {
    options: { schema: "main" },
    query: jest.fn(async (sql) => (/^\s*(UPDATE|DELETE)\b/i.test(sql) ? [rows, rows.length] : rows)),
  };
  Database.getInstance.mockResolvedValue(client);
  return client;
};
