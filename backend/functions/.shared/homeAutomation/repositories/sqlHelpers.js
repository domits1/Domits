// The schema comes from the connection, so the same code reads test.* on the test database and main.* elsewhere.
// A DataSource keeps its options on itself, a transaction manager on its connection.
export const qualifiedTable = (clientOrManager, table) => {
  const options = clientOrManager?.options ?? clientOrManager?.connection?.options;
  return `${options?.schema || "main"}.${table}`;
};

// UPDATE and DELETE return [rows, rowCount] from TypeORM's raw query, INSERT and SELECT return the rows.
export const rowsOf = (result) => (Array.isArray(result?.[0]) ? result[0] : (result ?? []));

export const requireId = (value, label) => {
  if (typeof value !== "string" || !value.trim() || value.length > 255) {
    throw new Error(`${label} must be a text of 1 to 255 characters.`);
  }
  return value;
};
