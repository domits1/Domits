import Database from "../../integrations/ORM/index.js";
import { isDsqlConflict } from "../../dsqlRetry.js";

const TABLE = "home_automation_credential_lease";

const requireText = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value;
};

// A string would turn `now + ttlMs` into a concatenation, and the lease would never expire.
const requireTimestamp = (value) => {
  if (!Number.isInteger(value) || value < 1) throw new Error("now must be a positive integer.");
  return value;
};

// UPDATE returns [rows, rowCount] from TypeORM's raw query, INSERT returns the rows.
const rowsOf = (result) => (Array.isArray(result?.[0]) ? result[0] : (result ?? []));

// One lease per integration account, so two Lambdas cannot refresh the same RemoteLock token at once. Expiry,
// not a release, is what frees the lease of a run that died.
export default class CredentialLeaseRepository {
  #getClient;

  constructor({ getClient = () => Database.getInstance() } = {}) {
    this.#getClient = getClient;
  }

  // On Aurora DSQL the loser of two simultaneous acquires fails at commit with 40001, which means "held".
  async tryAcquire(integrationAccountId, ownerId, { now = Date.now(), ttlMs } = {}) {
    const accountId = requireText(integrationAccountId, "integrationAccountId");
    const owner = requireText(ownerId, "ownerId");
    if (!Number.isInteger(ttlMs) || ttlMs < 1) throw new Error("ttlMs must be a positive integer.");
    requireTimestamp(now);

    const { client, table } = await this.#table();
    try {
      const result = await client.query(
        `INSERT INTO ${table} AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4)
         ON CONFLICT (integration_account_id) DO UPDATE
         SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
         WHERE lease.lease_expires_at <= $4
         RETURNING owner_id`,
        [accountId, owner, now + ttlMs, now]
      );
      return rowsOf(result).some((row) => row.owner_id === owner);
    } catch (error) {
      if (isDsqlConflict(error)) return false;
      throw error;
    }
  }

  // Keeps the row, so every later acquire takes the UPDATE branch and never races on a first insert.
  async release(integrationAccountId, ownerId, { now = Date.now() } = {}) {
    const accountId = requireText(integrationAccountId, "integrationAccountId");
    const owner = requireText(ownerId, "ownerId");
    requireTimestamp(now);

    const { client, table } = await this.#table();
    try {
      const result = await client.query(
        `UPDATE ${table}
         SET lease_expires_at = 0, updated_at = $3
         WHERE integration_account_id = $1 AND owner_id = $2
         RETURNING owner_id`,
        [accountId, owner, now]
      );
      return rowsOf(result).length > 0;
    } catch (error) {
      if (isDsqlConflict(error)) return false;
      throw error;
    }
  }

  async #table() {
    const client = await this.#getClient();
    const schema = client?.options?.schema || "main";
    return { client, table: `${schema}.${TABLE}` };
  }
}
