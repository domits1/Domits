import { randomUUID } from "node:crypto";
import { REMOTELOCK_ACCOUNT_STATUS as STATUS, REMOTELOCK_CHANNEL } from "../../homeAutomationConstants.js";
import { REMOTELOCK_OAUTH_ERROR_CODE as OAUTH_CODE, RemoteLockOAuthError } from "./remoteLockOAuthError.js";
import { REMOTELOCK_TOKEN_ERROR_CODE as CODE, RemoteLockTokenError } from "./remoteLockTokenError.js";
import { MAX_LEASE_TTL_MS } from "../../repositories/credentialLeaseRepository.js";

export const TOKEN_SAFETY_MARGIN_MS = 5 * 60_000;
export const TOKEN_USABLE_FLOOR_MS = 30_000;
// Has to outlast the worst case of one refresh; the constructor checks the arithmetic.
export const LEASE_TTL_MS = 45_000;
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
const TOKENS_NOT_SAVED_ERROR_CODE = "TOKENS_NOT_SAVED";

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
  // Two reads (under the lease, before the write), then a fence check and a write per attempt.
  const refreshAndSave = secretCallTimeoutMs * (2 + 2 * secretWriteAttempts) + OAUTH_WORST_CASE_MS + backoffs;
  const rejectedGrant = secretCallTimeoutMs * 3 + OAUTH_WORST_CASE_MS + refreshGraceMs;
  return Math.max(refreshAndSave, rejectedGrant);
};

const WRITE_OUTCOME = { SAVED: "saved", LEASE_LOST: "lease_lost" };

const fail = (code, retryable) => new RemoteLockTokenError({ code, retryable });

const isText = (value) => typeof value === "string" && value.length > 0;

const isRotated = (latest, current) =>
  latest.refreshToken !== current.refreshToken || latest.refreshIssuedAt > current.refreshIssuedAt;

// Hands out a valid access token and refreshes it before it expires. RemoteLock rotates the refresh token on every
// refresh, so two Lambdas refreshing at once can kill the connection; the lease lets one of them refresh while the
// others wait or use the token they already have. It logs only fixed events, never a token or provider data, and errors never carry provider data.
// Known risks:
// - If a refresh succeeds and every secret write then fails, the new refresh token exists only in memory and the old
//   one is dead, so the host has to reconnect.
// - If the lease is gone before the write, nothing is saved, the account is marked EXPIRED_CREDENTIALS and the call
//   fails with NEEDS_RECONNECT: the host has to reconnect.
// - Secrets Manager has no compare-and-swap. The re-read and the lease check before a write only narrow the window:
//   a write that timed out can still land after the lease moved on and overwrite newer tokens.
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
      // The write deadline plus skew; the budget check below keeps it under the ttl, as the repository requires.
      fenceMinRemainingMs: secretCallTimeoutMs + LEASE_CLOCK_SKEW_MS,
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
    let leased;
    try {
      leased = await this.#leaseRepository.tryAcquire(account.id, ownerId, { ttlMs: this.#timing.leaseTtlMs });
    } catch {
      // A lease outage must not break callers while the token they already have works.
      if (this.#isUsable(tokens)) return tokens.accessToken;
      throw fail(CODE.LEASE_UNAVAILABLE, true);
    }
    if (!leased) return this.#waitForRefresh(account, tokens);

    try {
      return await this.#refreshUnderLease(account, ownerId);
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

  // An unreleased lease expires by itself, and a failed release must not hide the result of the refresh.
  async #release(accountId, ownerId) {
    try {
      await this.#leaseRepository.release(accountId, ownerId);
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

  async #refreshUnderLease(account, ownerId) {
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
    const stored = await this.#storedIfRotated(account, current);
    if (stored) return this.#isUsable(stored) ? stored.accessToken : next.accessToken;

    const outcome = await this.#writeTokens(account, ownerId, next);
    if (outcome === WRITE_OUTCOME.LEASE_LOST) {
      console.warn(
        JSON.stringify({ event: "REMOTELOCK_TOKENS_NOT_SAVED", reason: "LEASE_LOST", integrationAccountId: account.id })
      );
      await this.#markTokensNotSaved(account.id);
      throw fail(CODE.NEEDS_RECONNECT, false);
    }
    return next.accessToken;
  }

  // The old refresh token is already rotated away, so the connection is broken whatever the mark does. A failing
  // store must not replace the reconnect error the host needs to see.
  async #markTokensNotSaved(accountId) {
    try {
      await this.#accountRepository.updateStatusIfCurrent(accountId, STATUS.CONNECTED, STATUS.EXPIRED_CREDENTIALS, {
        lastErrorCode: TOKENS_NOT_SAVED_ERROR_CODE,
        lastErrorMessage: "RemoteLock tokens could not be saved.",
      });
    } catch {
      // The next call finds out through invalid_grant and marks the account then.
    }
  }

  // A holder that outlived its lease may have saved newer tokens meanwhile. Failing to look is not a reason to drop
  // the rotated refresh token, so the write goes ahead.
  async #storedIfRotated(account, current) {
    try {
      const latest = await this.#readTokens(account.credentialsRef);
      return isRotated(latest, current) ? latest : null;
    } catch {
      return null;
    }
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
    return isRotated(latest, current) && this.#isUsable(latest) ? latest : null;
  }

  // Conditional on CONNECTED in one statement, so a host who disconnected meanwhile is not flipped back.
  async #markExpired(accountId) {
    await this.#accountRepository.updateStatusIfCurrent(accountId, STATUS.CONNECTED, STATUS.EXPIRED_CREDENTIALS, {
      lastErrorCode: REFRESH_REJECTED_ERROR_CODE,
      lastErrorMessage: "RemoteLock rejected the refresh token.",
    });
  }

  // The store calls cannot be aborted, so the wait is cut short instead. A write that times out can still land
  // later, possibly after another run saved newer tokens, and then it overwrites them.
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

  // Fails closed: a lease that cannot be confirmed means another run may own the secret by now.
  async #holdsLease(accountId, ownerId) {
    try {
      return await this.#withDeadline(
        this.#leaseRepository.isHeldBy(accountId, ownerId, { minRemainingMs: this.#timing.fenceMinRemainingMs })
      );
    } catch {
      return false;
    }
  }

  // Without the lease nothing is saved and the result says so; the caller marks the account, because the old refresh
  // token is gone and the host has to reconnect.
  async #writeTokens(account, ownerId, payload) {
    const { secretWriteAttempts, secretWriteBackoffMs } = this.#timing;
    for (let attempt = 1; attempt <= secretWriteAttempts; attempt += 1) {
      if (!(await this.#holdsLease(account.id, ownerId))) return WRITE_OUTCOME.LEASE_LOST;
      try {
        await this.#withDeadline(this.#credentialStore.writeSecret(account.credentialsRef, payload));
        return WRITE_OUTCOME.SAVED;
      } catch {
        if (attempt < secretWriteAttempts) await this.#sleep(secretWriteBackoffMs * attempt);
      }
    }
    // Not retryable: the refresh token that a retry would use was rotated away.
    throw fail(CODE.SECRET_STORE_ERROR, false);
  }
}
