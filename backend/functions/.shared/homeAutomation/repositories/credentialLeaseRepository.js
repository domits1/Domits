import Database from "../../integrations/ORM/index.js";
import { isDsqlConflict } from "../../dsqlRetry.js";

const TABLE = "home_automation_credential_lease";

// A bug must not be able to park an account's token refresh behind a lease for minutes.
export const MAX_LEASE_TTL_MS = 60_000;

// The database clock, so Lambdas with skewed clocks still agree on expiry. now() is fixed per transaction and every
// statement here is its own transaction.
const DATABASE_NOW_MS = "(floor(EXTRACT(EPOCH FROM now()) * 1000))::bigint";

// Above the cap throws instead of clamping: a caller that asks for more has a bug worth seeing.
const requireMs = (value, label, min, max = MAX_LEASE_TTL_MS) => {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}.`);
  }
  return value;
};

const requireText = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value;
};

// UPDATE returns [rows, rowCount] from TypeORM's raw query, INSERT and SELECT return the rows.
const rowsOf = (result) => (Array.isArray(result?.[0]) ? result[0] : (result ?? []));

// One lease per integration account, so two Lambdas cannot refresh the same RemoteLock token at once. Expiry,
// not a release, is what frees the lease of a run that died.
export default class CredentialLeaseRepository {
  #getClient;

  constructor({ getClient = () => Database.getInstance() } = {}) {
    this.#getClient = getClient;
  }

  // On Aurora DSQL the loser of two simultaneous acquires fails at commit with 40001, which means "held".
  async tryAcquire(integrationAccountId, ownerId, { ttlMs } = {}) {
    const accountId = requireText(integrationAccountId, "integrationAccountId");
    const owner = requireText(ownerId, "ownerId");
    requireMs(ttlMs, "ttlMs", 1);

    const { client, table } = await this.#table();
    try {
      const result = await client.query(
        `INSERT INTO ${table} AS lease (integration_account_id, owner_id, lease_expires_at, created_at, updated_at)
         SELECT $1::varchar, $2::varchar, clock.ms + $3::bigint, clock.ms, clock.ms
         FROM (SELECT ${DATABASE_NOW_MS} AS ms) AS clock
         ON CONFLICT (integration_account_id) DO UPDATE
         SET owner_id = EXCLUDED.owner_id, lease_expires_at = EXCLUDED.lease_expires_at, updated_at = EXCLUDED.updated_at
         WHERE lease.lease_expires_at <= EXCLUDED.updated_at
         RETURNING owner_id`,
        [accountId, owner, ttlMs]
      );
      return rowsOf(result).some((row) => row.owner_id === owner);
    } catch (error) {
      if (isDsqlConflict(error)) return false;
      throw error;
    }
  }

  // Keeps the row, so every later acquire takes the UPDATE branch and never races on a first insert.
  // Matches the owner only, not the expiry: an expired lease nobody took over is still released by its owner, which is
  // harmless, and once someone else took it over the owner no longer matches and this returns false.
  async release(integrationAccountId, ownerId) {
    const accountId = requireText(integrationAccountId, "integrationAccountId");
    const owner = requireText(ownerId, "ownerId");

    const { client, table } = await this.#table();
    try {
      const result = await client.query(
        `UPDATE ${table}
         SET lease_expires_at = 0, updated_at = ${DATABASE_NOW_MS}
         WHERE integration_account_id = $1 AND owner_id = $2
         RETURNING owner_id`,
        [accountId, owner]
      );
      return rowsOf(result).length > 0;
    } catch (error) {
      if (isDsqlConflict(error)) return false;
      throw error;
    }
  }

  // Check-then-act, not atomic: the lease can lapse between this read and the caller's write. It only narrows the
  // window, so minRemainingMs must outlast that write. It must also be shorter than the ttl the lease was acquired
  // with, or the check can never be true: the caller owns that rule (the token provider checks it in its constructor).
  // A conflict answers false, so a fence fails closed.
  async isHeldBy(integrationAccountId, ownerId, { minRemainingMs } = {}) {
    const accountId = requireText(integrationAccountId, "integrationAccountId");
    const owner = requireText(ownerId, "ownerId");
    requireMs(minRemainingMs, "minRemainingMs", 0, MAX_LEASE_TTL_MS - 1);

    const { client, table } = await this.#table();
    try {
      const result = await client.query(
        `SELECT 1 FROM ${table}
         WHERE integration_account_id = $1 AND owner_id = $2
           AND lease_expires_at > ${DATABASE_NOW_MS} + $3::bigint
         LIMIT 1`,
        [accountId, owner, minRemainingMs]
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
