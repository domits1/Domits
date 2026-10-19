import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { REMOTELOCK_ACCOUNT_STATUS as STATUS, REMOTELOCK_CHANNEL } from "../homeAutomationConstants.js";
import {
  REMOTELOCK_OAUTH_ERROR_CODE as OAUTH_CODE,
  RemoteLockOAuthError,
} from "../providers/remotelock/remoteLockOAuthError.js";
import {
  LEASE_TTL_MS,
  LEASE_WAIT_ATTEMPTS,
  LEASE_WAIT_BASE_MS,
  LEASE_WAIT_JITTER_MS,
} from "../providers/remotelock/remoteLockTokenProvider.js";
import { RemoteLockConfigError } from "../remoteLockConfig.js";

export const PENDING_CONNECT_MS = 10 * 60_000;
const DISPLAY_NAME = "RemoteLock";
const INACTIVE_STATUSES = new Set([STATUS.NOT_CONNECTED, STATUS.DISCONNECTED]);

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const hashOf = (state) => createHash("sha256").update(state).digest("hex");

const reply = (statusCode, response) => ({ statusCode, response });
// Fixed codes only: nothing the provider or the secret store said goes into a response.
const failure = (statusCode, error, retryable = false) => reply(statusCode, { error, retryable });

// Hashing first gives both sides one length, so timingSafeEqual cannot throw on a malformed stored value.
const matchesState = (stored, state) => {
  const expected = Buffer.from(hashOf(state));
  const actual = Buffer.from(String(stored ?? ""));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const mapExchangeFailure = (error) => {
  if (!(error instanceof RemoteLockOAuthError)) throw error;
  if (error.code === OAUTH_CODE.AUTH && error.oauthError === "invalid_grant") return failure(400, "CODE_REJECTED");
  if (error.retryable) return failure(503, "PROVIDER_UNAVAILABLE", true);
  return failure(502, "PROVIDER_ERROR");
};

// Connect, status and disconnect for the host's own RemoteLock account. Every method gets the user id from the
// verified token, so a caller can only ever reach their own row.
export default class RemoteLockConnectionService {
  #accounts;
  #store;
  #leases;
  #loadOAuthClient;
  #now;
  #sleep;
  #randomId;
  #newState;
  #random;

  constructor({
    accounts,
    credentialStore,
    leaseRepository,
    loadOAuthClient,
    now = Date.now,
    sleep = defaultSleep,
    randomId = randomUUID,
    newState = () => randomBytes(32).toString("base64url"),
    random = Math.random,
  }) {
    this.#accounts = accounts;
    this.#store = credentialStore;
    this.#leases = leaseRepository;
    this.#loadOAuthClient = loadOAuthClient;
    this.#now = now;
    this.#sleep = sleep;
    this.#randomId = randomId;
    this.#newState = newState;
    this.#random = random;
  }

  startConnect(userId) {
    return this.#guard(async () => {
      const client = await this.#loadOAuthClient();
      const known = await this.#accounts.findByUserIdAndChannel(userId, REMOTELOCK_CHANNEL);
      const id = known?.id || this.#randomId();
      return this.#withLease(id, () => this.#startUnderLease(client, userId, id));
    });
  }

  // Only the hash of the state is stored, with its expiry, inside the account's own secret. A live connection is
  // refused because writing the pending state would overwrite its tokens, so the row is read again under the lease:
  // a complete that held it may have connected the account since the first read.
  async #startUnderLease(client, userId, id) {
    const existing = await this.#accounts.findByUserIdAndChannel(userId, REMOTELOCK_CHANNEL);
    if (existing?.status === STATUS.CONNECTED) return failure(409, "ALREADY_CONNECTED");

    const state = this.#newState();
    let credentialsRef;
    try {
      credentialsRef = await this.#store.ensureSecret({
        userId,
        integrationAccountId: id,
        payload: { pendingConnect: { stateHash: hashOf(state), expiresAt: this.#now() + PENDING_CONNECT_MS } },
      });
    } catch {
      return failure(503, "SECRET_STORE_ERROR", true);
    }

    await this.#saveConnecting(existing, { id, userId, credentialsRef });
    // The state has to reach the browser to come back; it is the one place it leaves this service.
    return reply(200, { status: STATUS.CONNECTING, authorizeUrl: client.buildAuthorizeUrl(state) });
  }

  async #saveConnecting(existing, { id, userId, credentialsRef }) {
    if (existing) {
      await this.#accounts.update(id, {
        status: STATUS.CONNECTING,
        displayName: DISPLAY_NAME,
        credentialsRef,
        lastErrorCode: null,
        lastErrorMessage: null,
      });
      return;
    }
    const now = this.#now();
    await this.#accounts.create({
      id,
      userId,
      channel: REMOTELOCK_CHANNEL,
      externalAccountId: null,
      displayName: DISPLAY_NAME,
      status: STATUS.CONNECTING,
      credentialsRef,
      lastSuccessfulSyncAt: null,
      lastFailedSyncAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  completeConnect(userId, { code, state } = {}) {
    if (!isText(code) || !isText(state)) return Promise.resolve(failure(400, "MISSING_FIELD"));

    return this.#guard(async () => {
      const client = await this.#loadOAuthClient();
      const account = await this.#accounts.findByUserIdAndChannel(userId, REMOTELOCK_CHANNEL);
      if (account?.status !== STATUS.CONNECTING || !account.credentialsRef) return failure(409, "STATE_INVALID");
      // Under the lease so two submissions of one callback cannot interleave their secret writes.
      return this.#withLease(account.id, () => this.#completeUnderLease(account, client, code, state));
    });
  }

  async #completeUnderLease(account, client, code, state) {
    const ref = account.credentialsRef;
    let pending;
    try {
      pending = (await this.#store.readSecretOrNull(ref))?.pendingConnect;
    } catch {
      return failure(503, "SECRET_STORE_ERROR", true);
    }
    if (!matchesState(pending?.stateHash, state)) return failure(409, "STATE_INVALID");
    if (!(Number.isFinite(pending.expiresAt) && this.#now() < pending.expiresAt)) return failure(409, "STATE_EXPIRED");

    // Used up before the exchange: the code is single-use at RemoteLock, so a failed exchange needs a new attempt.
    if (!(await this.#tryWrite(ref, {}))) return failure(503, "SECRET_STORE_ERROR", true);

    let issued;
    try {
      issued = await client.exchangeCode(code);
    } catch (error) {
      return mapExchangeFailure(error);
    }
    const { accessToken, refreshToken, tokenType, expiresAt, refreshIssuedAt } = issued;
    if (!(await this.#tryWrite(ref, { accessToken, refreshToken, tokenType, expiresAt, refreshIssuedAt }))) {
      return failure(503, "SECRET_STORE_ERROR", true);
    }

    await this.#accounts.update(account.id, { status: STATUS.CONNECTED, lastErrorCode: null, lastErrorMessage: null });
    return reply(200, { status: STATUS.CONNECTED, lastSyncAt: account.lastSuccessfulSyncAt ?? null });
  }

  async getStatus(userId) {
    return this.#guard(async () => {
      const account = await this.#accounts.findByUserIdAndChannel(userId, REMOTELOCK_CHANNEL);
      // CONNECTING has no actions in the UI, so an abandoned attempt has to read as not connected.
      const isAbandoned =
        account?.status === STATUS.CONNECTING && this.#now() - account.updatedAt >= PENDING_CONNECT_MS;
      const status = !account || isAbandoned ? STATUS.NOT_CONNECTED : account.status;
      return reply(200, { status, lastSyncAt: account?.lastSuccessfulSyncAt ?? null });
    });
  }

  // Idempotent. It takes the token provider's lease so a refresh in flight cannot write tokens back after the scrub.
  disconnect(userId) {
    return this.#guard(async () => {
      const account = await this.#accounts.findByUserIdAndChannel(userId, REMOTELOCK_CHANNEL);
      if (!account) return reply(200, { status: STATUS.NOT_CONNECTED, lastSyncAt: null });
      if (INACTIVE_STATUSES.has(account.status)) {
        return reply(200, { status: account.status, lastSyncAt: account.lastSuccessfulSyncAt ?? null });
      }
      return this.#withLease(account.id, () => this.#disconnectUnderLease(account));
    });
  }

  async #disconnectUnderLease(account) {
    if (account.credentialsRef) {
      let secret;
      try {
        secret = await this.#store.readSecretOrNull(account.credentialsRef);
      } catch {
        return failure(503, "SECRET_STORE_ERROR", true);
      }
      await this.#revokeQuietly(secret?.refreshToken);
      // A secret that cannot be scrubbed keeps the row connected, so the host can retry.
      if (!(await this.#tryWrite(account.credentialsRef, {}))) return failure(503, "SECRET_STORE_ERROR", true);
    }
    await this.#accounts.disconnect(account.id);
    return reply(200, { status: STATUS.DISCONNECTED, lastSyncAt: account.lastSuccessfulSyncAt ?? null });
  }

  // A failed revoke leaves the grant alive at RemoteLock, which the host can end there; it must not block the disconnect.
  async #revokeQuietly(refreshToken) {
    if (!isText(refreshToken)) return;
    try {
      await (await this.#loadOAuthClient()).revoke(refreshToken);
    } catch {
      console.warn(JSON.stringify({ event: "REMOTELOCK_REVOKE_FAILED" }));
    }
  }

  async #tryWrite(ref, payload) {
    try {
      await this.#store.writeSecret(ref, payload);
      return true;
    } catch {
      return false;
    }
  }

  async #withLease(accountId, work) {
    const ownerId = this.#randomId();
    if (!(await this.#acquire(accountId, ownerId))) return failure(503, "LEASE_UNAVAILABLE", true);
    try {
      return await work();
    } finally {
      try {
        await this.#leases.release(accountId, ownerId);
      } catch {
        // Expiry frees the lease.
      }
    }
  }

  // Waits like the token provider does, but briefly: a person is on the other end of this request.
  async #acquire(accountId, ownerId) {
    for (let attempt = 1; attempt <= LEASE_WAIT_ATTEMPTS; attempt += 1) {
      try {
        if (await this.#leases.tryAcquire(accountId, ownerId, { ttlMs: LEASE_TTL_MS })) return true;
      } catch {
        return false;
      }
      if (attempt < LEASE_WAIT_ATTEMPTS) {
        await this.#sleep(LEASE_WAIT_BASE_MS + Math.floor(this.#random() * LEASE_WAIT_JITTER_MS));
      }
    }
    return false;
  }

  async #guard(work) {
    try {
      return await work();
    } catch (error) {
      if (error instanceof RemoteLockConfigError) return failure(503, "CONFIG_MISSING");
      // The name only: a message from the store or the provider can quote a token.
      console.error(JSON.stringify({ event: "REMOTELOCK_CONNECTION_FAILED", errorName: error?.name ?? null }));
      return failure(500, "INTERNAL_ERROR");
    }
  }
}
