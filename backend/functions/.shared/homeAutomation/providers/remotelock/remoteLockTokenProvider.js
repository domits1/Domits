import { randomUUID } from "node:crypto";
import { REMOTELOCK_ACCOUNT_STATUS as STATUS, REMOTELOCK_CHANNEL } from "../../homeAutomationConstants.js";
import { REMOTELOCK_OAUTH_ERROR_CODE as OAUTH_CODE, RemoteLockOAuthError } from "./remoteLockOAuthError.js";
import { REMOTELOCK_TOKEN_ERROR_CODE as CODE, RemoteLockTokenError } from "./remoteLockTokenError.js";

export const TOKEN_SAFETY_MARGIN_MS = 5 * 60_000;
export const TOKEN_USABLE_FLOOR_MS = 30_000;
// Has to outlast the worst case of one refresh; the constructor checks the arithmetic.
export const LEASE_TTL_MS = 30_000;
export const MAX_LEASE_TTL_MS = 60_000;
export const LEASE_WAIT_ATTEMPTS = 6;
export const LEASE_WAIT_BASE_MS = 1000;
export const LEASE_WAIT_JITTER_MS = 500;
export const SECRET_WRITE_ATTEMPTS = 3;
export const SECRET_WRITE_BACKOFF_MS = 200;
export const SECRET_CALL_TIMEOUT_MS = 2000;
export const REFRESH_GRACE_MS = 2000;
// The OAuth client's own worst case: its 10 s timeout plus the 2 s error body limit.
const OAUTH_WORST_CASE_MS = 12_000;
const LEASE_CLOCK_SKEW_MS = 5000;
const REFRESH_REJECTED_ERROR_CODE = "REFRESH_TOKEN_REJECTED";

const RECONNECT_STATUSES = new Set([STATUS.AUTHENTICATION_ERROR, STATUS.CONNECTION_ERROR, STATUS.EXPIRED_CREDENTIALS]);

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requireDependency = (value, label) => {
  if (!value) throw new Error(`${label} is required.`);
  return value;
};

const requirePositiveInteger = (value, label) => {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer.`);
  return value;
};

const worstCaseMs = ({ secretCallTimeoutMs, secretWriteAttempts, secretWriteBackoffMs, refreshGraceMs }) => {
  const backoffs = (secretWriteBackoffMs * secretWriteAttempts * (secretWriteAttempts - 1)) / 2;
  const refreshAndSave = secretCallTimeoutMs * (1 + secretWriteAttempts) + OAUTH_WORST_CASE_MS + backoffs;
  const rejectedGrant = secretCallTimeoutMs * 3 + OAUTH_WORST_CASE_MS + refreshGraceMs;
  return Math.max(refreshAndSave, rejectedGrant);
};

const fail = (code, retryable) => new RemoteLockTokenError({ code, retryable });

const isText = (value) => typeof value === "string" && value.length > 0;

// Hands out a valid access token and refreshes it before it expires. RemoteLock rotates the refresh token on every
// refresh, so two Lambdas refreshing at once can kill the connection; the lease lets one of them refresh while the
// others wait or use the token they already have. Nothing here logs, and errors never carry provider data.
// Known risk: if a refresh succeeds and every secret write then fails, the new refresh token exists only in memory
// and the old one is dead, so the host has to reconnect.
export class RemoteLockTokenProvider {
  #oauthClient;
  #credentialStore;
  #leaseRepository;
  #accountRepository;
  #now;
  #sleep;
  #randomId;
  #random;
  #timing;

  constructor({
    oauthClient,
    credentialStore,
    leaseRepository,
    accountRepository,
    now = Date.now,
    sleep = defaultSleep,
    randomId = randomUUID,
    random = Math.random,
    leaseTtlMs = LEASE_TTL_MS,
    leaseWaitAttempts = LEASE_WAIT_ATTEMPTS,
    leaseWaitBaseMs = LEASE_WAIT_BASE_MS,
    leaseWaitJitterMs = LEASE_WAIT_JITTER_MS,
    secretWriteAttempts = SECRET_WRITE_ATTEMPTS,
    secretWriteBackoffMs = SECRET_WRITE_BACKOFF_MS,
    secretCallTimeoutMs = SECRET_CALL_TIMEOUT_MS,
    refreshGraceMs = REFRESH_GRACE_MS,
  } = {}) {
    this.#oauthClient = requireDependency(oauthClient, "oauthClient");
    this.#credentialStore = requireDependency(credentialStore, "credentialStore");
    this.#leaseRepository = requireDependency(leaseRepository, "leaseRepository");
    this.#accountRepository = requireDependency(accountRepository, "accountRepository");
    this.#now = now;
    this.#sleep = sleep;
    this.#randomId = randomId;
    this.#random = random;
    if (requirePositiveInteger(leaseTtlMs, "leaseTtlMs") > MAX_LEASE_TTL_MS) {
      throw new Error(`leaseTtlMs can be at most ${MAX_LEASE_TTL_MS}.`);
    }
    this.#timing = {
      leaseTtlMs,
      leaseWaitAttempts: requirePositiveInteger(leaseWaitAttempts, "leaseWaitAttempts"),
      leaseWaitBaseMs: requirePositiveInteger(leaseWaitBaseMs, "leaseWaitBaseMs"),
      leaseWaitJitterMs: requirePositiveInteger(leaseWaitJitterMs, "leaseWaitJitterMs"),
      secretWriteAttempts: requirePositiveInteger(secretWriteAttempts, "secretWriteAttempts"),
      secretWriteBackoffMs: requirePositiveInteger(secretWriteBackoffMs, "secretWriteBackoffMs"),
      secretCallTimeoutMs: requirePositiveInteger(secretCallTimeoutMs, "secretCallTimeoutMs"),
      refreshGraceMs: requirePositiveInteger(refreshGraceMs, "refreshGraceMs"),
    };
    if (worstCaseMs(this.#timing) + LEASE_CLOCK_SKEW_MS > leaseTtlMs) {
      throw new Error("leaseTtlMs is shorter than the worst case of one refresh.");
    }
  }

  // The caller has to check that the host owns the account: this only knows the account id.
  async getAccessToken(integrationAccountId) {
    const account = await this.#loadAccount(integrationAccountId);
    const tokens = await this.#readTokens(account.credentialsRef);
    if (this.#isFresh(tokens)) return tokens.accessToken;

    const ownerId = this.#randomId();
    if (!(await this.#acquire(account.id, ownerId))) return this.#waitForRefresh(account, tokens);

    try {
      return await this.#refreshUnderLease(account);
    } finally {
      await this.#release(account.id, ownerId);
    }
  }

  async #loadAccount(integrationAccountId) {
    if (!isText(integrationAccountId) || !integrationAccountId.trim())
      throw new Error("integrationAccountId is required.");
    const account = await this.#accountRepository.getById(integrationAccountId);
    if (!account || account.channel !== REMOTELOCK_CHANNEL || !account.credentialsRef) {
      throw fail(CODE.NOT_CONNECTED, false);
    }
    if (RECONNECT_STATUSES.has(account.status)) throw fail(CODE.NEEDS_RECONNECT, false);
    if (account.status !== STATUS.CONNECTED) throw fail(CODE.NOT_CONNECTED, false);
    return account;
  }

  async #readTokens(credentialsRef) {
    let payload;
    try {
      payload = await this.#withDeadline(this.#credentialStore.readSecret(credentialsRef));
    } catch {
      throw fail(CODE.SECRET_STORE_ERROR, true);
    }
    const isValid =
      payload &&
      isText(payload.accessToken) &&
      isText(payload.refreshToken) &&
      Number.isFinite(payload.expiresAt) &&
      payload.expiresAt > 0;
    if (!isValid) throw fail(CODE.SECRET_INVALID, false);
    return { ...payload };
  }

  // Half the lifetime at most, so a short-lived token does not refresh on every call.
  #isFresh(tokens) {
    const lifetime = tokens.expiresAt - tokens.refreshIssuedAt;
    const margin = lifetime > 0 ? Math.min(TOKEN_SAFETY_MARGIN_MS, lifetime / 2) : TOKEN_SAFETY_MARGIN_MS;
    return tokens.expiresAt - this.#now() > margin;
  }

  #isUsable(tokens) {
    return tokens.expiresAt - this.#now() > TOKEN_USABLE_FLOOR_MS;
  }

  async #acquire(accountId, ownerId) {
    try {
      return await this.#leaseRepository.tryAcquire(accountId, ownerId, {
        now: this.#now(),
        ttlMs: this.#timing.leaseTtlMs,
      });
    } catch {
      throw fail(CODE.LEASE_UNAVAILABLE, true);
    }
  }

  // An unreleased lease expires by itself, and a failed release must not hide the result of the refresh.
  async #release(accountId, ownerId) {
    try {
      await this.#leaseRepository.release(accountId, ownerId, { now: this.#now() });
    } catch {
      // Expiry frees the lease.
    }
  }

  async #waitForRefresh(account, tokens) {
    if (this.#isUsable(tokens)) return tokens.accessToken;

    const { leaseWaitAttempts, leaseWaitBaseMs, leaseWaitJitterMs } = this.#timing;
    for (let attempt = 1; attempt <= leaseWaitAttempts; attempt += 1) {
      await this.#sleep(leaseWaitBaseMs + Math.floor(this.#random() * leaseWaitJitterMs));
      const latest = await this.#readTokens(account.credentialsRef);
      if (this.#isFresh(latest)) return latest.accessToken;
    }
    throw fail(CODE.LEASE_UNAVAILABLE, true);
  }

  async #refreshUnderLease(account) {
    const current = await this.#readTokens(account.credentialsRef);
    if (this.#isFresh(current)) return current.accessToken;

    let issued;
    try {
      issued = await this.#oauthClient.refresh(current.refreshToken);
    } catch (error) {
      return this.#afterRefreshFailure(account, current, error);
    }

    const next = {
      ...current,
      accessToken: issued.accessToken,
      refreshToken: issued.refreshToken,
      tokenType: issued.tokenType,
      expiresAt: issued.expiresAt,
      refreshIssuedAt: issued.refreshIssuedAt,
    };
    await this.#writeTokens(account.credentialsRef, next);
    return next.accessToken;
  }

  // A timeout or lost answer may still have rotated the token at RemoteLock, so the refresh is never repeated in the
  // same call: the next call finds out through invalid_grant.
  async #afterRefreshFailure(account, current, error) {
    if (!(error instanceof RemoteLockOAuthError)) throw fail(CODE.UNEXPECTED, false);

    if (error.code === OAUTH_CODE.AUTH) {
      if (error.oauthError === "invalid_grant") return this.#recoverFromInvalidGrant(account, current);
      throw fail(CODE.CONFIG_ERROR, false);
    }

    const isTransient = error.retryable || error.code === OAUTH_CODE.INVALID_RESPONSE;
    if (!isTransient) throw fail(CODE.CONFIG_ERROR, false);
    if (this.#isUsable(current)) return current.accessToken;
    throw fail(CODE.PROVIDER_UNAVAILABLE, error.retryable);
  }

  // A holder that outlived its lease may still be about to save the tokens that made this one invalid, so the
  // secret is read again after a grace period before the host is asked to reconnect.
  async #recoverFromInvalidGrant(account, current) {
    const rotated = await this.#rotatedByAnotherRun(account, current);
    if (rotated) return rotated.accessToken;

    await this.#sleep(this.#timing.refreshGraceMs);
    const rotatedLater = await this.#rotatedByAnotherRun(account, current);
    if (rotatedLater) return rotatedLater.accessToken;

    await this.#markExpired(account.id);
    throw fail(CODE.NEEDS_RECONNECT, false);
  }

  async #rotatedByAnotherRun(account, current) {
    const latest = await this.#readTokens(account.credentialsRef);
    return latest.refreshToken !== current.refreshToken && this.#isUsable(latest) ? latest : null;
  }

  // update() rewrites the whole row, so a host who disconnected meanwhile must not be flipped back.
  async #markExpired(accountId) {
    const latest = await this.#accountRepository.getById(accountId);
    if (latest?.status !== STATUS.CONNECTED) return;
    await this.#accountRepository.update(accountId, {
      status: STATUS.EXPIRED_CREDENTIALS,
      lastErrorCode: REFRESH_REJECTED_ERROR_CODE,
      lastErrorMessage: "RemoteLock rejected the refresh token.",
    });
  }

  // The store calls cannot be aborted, so the wait is cut short instead. A write that times out can still land
  // later, which is harmless: it holds the same tokens.
  async #withDeadline(call) {
    let timer;
    try {
      return await Promise.race([
        call,
        new Promise((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error("secret store deadline")), this.#timing.secretCallTimeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async #writeTokens(credentialsRef, payload) {
    const { secretWriteAttempts, secretWriteBackoffMs } = this.#timing;
    for (let attempt = 1; attempt <= secretWriteAttempts; attempt += 1) {
      try {
        await this.#withDeadline(this.#credentialStore.writeSecret(credentialsRef, payload));
        return;
      } catch {
        if (attempt < secretWriteAttempts) await this.#sleep(secretWriteBackoffMs * attempt);
      }
    }
    // Not retryable: the refresh token that a retry would use was rotated away.
    throw fail(CODE.SECRET_STORE_ERROR, false);
  }
}
