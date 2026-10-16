const EXPECTED_COLUMNS = {
  id: ["character varying", "NO"],
  review_id: ["character varying", "NO"],
  author_id: ["character varying", "NO"],
  author_role: ["character varying", "NO"],
  status: ["character varying", "NO"],
  message: ["text", "NO"],
  created_at: ["bigint", "NO"],
  updated_at: ["bigint", "NO"],
  published_at: ["bigint", "YES"],
  deleted_at: ["bigint", "YES"],
};

// Read-only deployment check: CREATE TABLE IF NOT EXISTS does not repair a mismatched existing table.
export const assertReviewResponseSchema = async (dataSource, schema) => {
  const columns = await dataSource.query(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2",
    [schema, "review_response"]
  );
  const actual = new Map(columns.map((column) => [column.column_name, column]));
  const mismatches = Object.entries(EXPECTED_COLUMNS).filter(([name, [type, nullable]]) => {
    const column = actual.get(name);
    return !column || column.data_type !== type || column.is_nullable !== nullable;
  }).map(([name]) => name);
  if (mismatches.length) {
    throw new Error(`ReviewSystem deployment blocked: ${schema}.review_response is missing or incompatible (${mismatches.join(", ")}). Apply and verify 20261014_create_review_response before deployment.`);
  }
};
