// Write safety for listingOrderSmoke.js. Plain functions only, with nothing that runs on import, so Jest can load
// this file. The rail has to stay tested because the script it protects can delete rows.

export const TARGET_FLAG = "--target=";
// Shown in hints instead of the real host, so the host has to be read from the "Connected to" line and typed back.
export const TARGET_HINT = `${TARGET_FLAG}<paste the host shown above>`;

// An expected refusal: the script prints only the message. Any other error keeps its stack trace.
export class RefusedError extends Error {
  constructor(message) {
    super(message);
    this.name = "RefusedError";
  }
}

export const describeTarget = (client, region, awsProfile) => ({
  host: client.options.host,
  database: client.options.database,
  schema: client.options.schema,
  region,
  awsProfile,
});

export const formatTarget = (target) =>
  `Connected to: host=${target.host}  database=${target.database}  schema=${target.schema}  ` +
  `region=${target.region}  AWS profile=${target.awsProfile}`;

export const assertTestSchema = (target) => {
  if (target.schema !== "test") {
    throw new RefusedError(`Refusing to run: the data source schema is "${target.schema}", not "test".`);
  }
};

// A write needs the exact host typed back. The rail cannot tell a development cluster from a production one: it
// makes the person read which cluster this is, and recognizing it is still their job.
export const requireConfirmedTarget = (target, argv) => {
  if (!target.host) {
    // Without this, a missing host and a missing flag would both be undefined and compare equal.
    throw new RefusedError("Refusing to write: the connection reports no host, so there is nothing to confirm.");
  }
  const given = argv.find((argument) => argument.startsWith(TARGET_FLAG))?.slice(TARGET_FLAG.length);
  if (given === target.host) {
    return;
  }
  throw new RefusedError(
    "Refusing to write. Check that the target printed above is the cluster you mean, then repeat the same " +
      `command with: ${TARGET_HINT}` +
      (given === undefined ? "" : `\n(You passed ${TARGET_FLAG}${given}, which does not match the connected host.)`)
  );
};

// The only way the script touches the database. write() confirms the target before it reaches the client, so there
// is no separate check to forget or delete.
//
// read() guards against a write slipping in by mistake. It reads the shape of the statement. It refuses:
//   - anything that does not start with SELECT (INSERT, UPDATE, DELETE, DDL, and a CTE that changes data);
//   - a second statement after a semicolon;
//   - SELECT ... INTO, which creates a table;
//   - a locking read: FOR UPDATE, FOR NO KEY UPDATE, FOR SHARE, FOR KEY SHARE.
// It does NOT, and cannot, see a side effect inside a function called from a SELECT, such as setval() or
// pg_terminate_backend(). The function's name is in the text, but the text cannot tell which functions carry a side
// effect. The guard does not cover those: what is written into the read() calls here does, so review those calls.
// This is a cheap guard, not a SQL sandbox.
//
// A false refusal is the safe way to be wrong, so the word checks are blunt: 'into' or 'for update' inside a string
// literal is refused too.
const STARTS_WITH_SELECT = /^\s*select\b/i;
const HAS_SECOND_STATEMENT = /;\s*\S/;
const CREATES_A_TABLE = /\binto\b/i;
const IS_A_LOCKING_READ = /\bfor\s+(?:no\s+key\s+)?(?:update|(?:key\s+)?share)\b/i;
const isSingleSelect = (sql) =>
  typeof sql === "string" &&
  STARTS_WITH_SELECT.test(sql) &&
  !HAS_SECOND_STATEMENT.test(sql) &&
  !CREATES_A_TABLE.test(sql) &&
  !IS_A_LOCKING_READ.test(sql);

export const read = async (client, sql, params) => {
  if (!isSingleSelect(sql)) {
    throw new RefusedError("Refusing to read: only a single SELECT statement may go through read().");
  }
  return client.query(sql, params);
};

export const write = async (target, argv, client, sql, params) => {
  requireConfirmedTarget(target, argv);
  return client.query(sql, params);
};
