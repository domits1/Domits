import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  LEASE_TTL_MS,
  LEASE_WAIT_ATTEMPTS,
  LEASE_WAIT_BASE_MS,
  LEASE_WAIT_JITTER_MS,
  REFRESH_GRACE_MS,
  RemoteLockTokenProvider,
  SECRET_WRITE_ATTEMPTS,
  SECRET_WRITE_BACKOFF_MS,
} from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockTokenProvider.js";
import { MAX_LEASE_TTL_MS } from "../../functions/.shared/homeAutomation/repositories/credentialLeaseRepository.js";
import { RemoteLockTokenError } from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockTokenError.js";
import { RemoteLockOAuthError } from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockOAuthError.js";
import {
  REMOTELOCK_ACCOUNT_STATUS,
  REMOTELOCK_CHANNEL,
} from "../../functions/.shared/homeAutomation/homeAutomationConstants.js";

const NOW = 1_800_000_000_000;
const ACCOUNT_ID = "account-1";
const REF = "domits/remotelock/user-1/account-1";
const ACCESS = "access-token-aaa";
const REFRESH = "refresh-token-bbb";
const NEW_ACCESS = "access-token-ccc";
const NEW_REFRESH = "refresh-token-ddd";
const SECRETS = [ACCESS, REFRESH, NEW_ACCESS, NEW_REFRESH];
// The default write deadline plus the clock skew allowance.
const FENCE_MIN_REMAINING_MS = 7000;

const tokens = (overrides = {}) => ({
  accessToken: ACCESS,
  refreshToken: REFRESH,
  tokenType: "Bearer",
  refreshIssuedAt: NOW - 3_600_000,
  expiresAt: NOW + 3_600_000,
  ...overrides,
});
const FRESH = tokens();
const STALE = tokens({ expiresAt: NOW + 120_000 });
const EXPIRED = tokens({ expiresAt: NOW + 10_000 });
const ISSUED = {
  accessToken: NEW_ACCESS,
  refreshToken: NEW_REFRESH,
  tokenType: "Bearer",
  expiresAt: NOW + 7_200_000,
  refreshIssuedAt: NOW,
};

const oauthError = (code, { status = null, retryable, oauthError: name = null } = {}) =>
  new RemoteLockOAuthError({ operation: "refresh", code, status, retryable, oauthError: name });

const makeStore = (initial) => {
  let payload = initial;
  return {
    readSecret: jest.fn(async () => (payload ? { ...payload } : null)),
    writeSecret: jest.fn(async (_ref, next) => {
      payload = { ...next };
    }),
    current: () => payload,
    replace: (next) => {
      payload = next;
    },
  };
};

const makeAccounts = (
  row = { id: ACCOUNT_ID, channel: REMOTELOCK_CHANNEL, status: "CONNECTED", credentialsRef: REF }
) => {
  let current = row ? { ...row } : null;
  return {
    getById: jest.fn(async () => (current ? { ...current } : null)),
    // Same rule as the real repository: only applied while the status is still the expected one.
    updateStatusIfCurrent: jest.fn(async (_id, expected, next, details) => {
      if (current?.status !== expected) return false;
      current = { ...current, status: next, ...details };
      return true;
    }),
    setStatus: (status) => {
      current = { ...current, status };
    },
    current: () => current,
  };
};

// Same rules as the real repository: held until it expires, released only by its owner. The clock is frozen at NOW.
const makeLease = () => {
  const leases = new Map();
  return {
    tryAcquire: jest.fn(async (id, owner, { ttlMs }) => {
      if (leases.get(id)?.expiresAt > NOW) return false;
      leases.set(id, { owner, expiresAt: NOW + ttlMs });
      return true;
    }),
    release: jest.fn(async (id, owner) => {
      if (leases.get(id)?.owner !== owner) return false;
      leases.set(id, { owner, expiresAt: 0 });
      return true;
    }),
    isHeldBy: jest.fn(async (id, owner, { minRemainingMs }) => {
      const held = leases.get(id);
      return held?.owner === owner && held.expiresAt > NOW + minRemainingMs;
    }),
  };
};

const build = ({ secret = STALE, account, refresh = async () => ISSUED, ...options } = {}) => {
  const store = makeStore(secret);
  const accounts = makeAccounts(account);
  const lease = makeLease();
  const oauth = { refresh: jest.fn(refresh) };
  const sleep = jest.fn(async () => {});
  let sequence = 0;
  const provider = new RemoteLockTokenProvider({
    oauthClient: oauth,
    credentialStore: store,
    leaseRepository: lease,
    accountRepository: accounts,
    now: () => NOW,
    sleep,
    random: () => 0,
    randomId: () => `owner-${(sequence += 1)}`,
    ...options,
  });
  return { provider, store, accounts, lease, oauth, sleep };
};

const dumpOf = (error) => JSON.stringify(error, Object.getOwnPropertyNames(error));
const failureOf = (promise) =>
  promise.then(
    () => null,
    (caught) => caught
  );

afterEach(() => jest.restoreAllMocks());

describe("RemoteLockTokenProvider fast path", () => {
  it("returns a fresh token without a lease or a refresh", async () => {
    const { provider, lease, oauth } = build({ secret: FRESH });

    await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(ACCESS);

    expect(lease.tryAcquire).not.toHaveBeenCalled();
    expect(oauth.refresh).not.toHaveBeenCalled();
  });

  it("refreshes a token exactly at the five minute margin, and keeps one just above it or a short-lived one at half its life", async () => {
    const atMargin = build({ secret: tokens({ expiresAt: NOW + 300_000 }) });
    const aboveMargin = build({ secret: tokens({ expiresAt: NOW + 300_001 }) });
    const shortLived = build({ secret: tokens({ refreshIssuedAt: NOW - 200_000, expiresAt: NOW + 280_000 }) });

    await Promise.all([atMargin, aboveMargin, shortLived].map(({ provider }) => provider.getAccessToken(ACCOUNT_ID)));

    expect(atMargin.oauth.refresh).toHaveBeenCalledTimes(1);
    expect(aboveMargin.oauth.refresh).not.toHaveBeenCalled();
    expect(shortLived.oauth.refresh).not.toHaveBeenCalled();
  });
});

describe("RemoteLockTokenProvider account checks", () => {
  it.each([
    ["no account", null, "NOT_CONNECTED"],
    [
      "another channel",
      { id: ACCOUNT_ID, channel: "CHANNEX", status: "CONNECTED", credentialsRef: REF },
      "NOT_CONNECTED",
    ],
    [
      "no credentials ref",
      { id: ACCOUNT_ID, channel: REMOTELOCK_CHANNEL, status: "CONNECTED", credentialsRef: null },
      "NOT_CONNECTED",
    ],
    ...["NOT_CONNECTED", "CONNECTING", "DISCONNECTED"].map((status) => [
      `status ${status}`,
      { id: ACCOUNT_ID, channel: REMOTELOCK_CHANNEL, status, credentialsRef: REF },
      "NOT_CONNECTED",
    ]),
    ...["AUTHENTICATION_ERROR", "CONNECTION_ERROR", "EXPIRED_CREDENTIALS"].map((status) => [
      `status ${status}`,
      { id: ACCOUNT_ID, channel: REMOTELOCK_CHANNEL, status, credentialsRef: REF },
      "NEEDS_RECONNECT",
    ]),
  ])(
    "throws a non-retryable error for %s, before touching the secret or the provider",
    async (_label, account, code) => {
      const { provider, store, oauth, lease } = build({ account });

      const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

      expect(error).toBeInstanceOf(RemoteLockTokenError);
      expect(error).toMatchObject({ code, retryable: false });
      expect(store.readSecret).not.toHaveBeenCalled();
      expect(oauth.refresh).not.toHaveBeenCalled();
      expect(lease.tryAcquire).not.toHaveBeenCalled();
    }
  );

  it("rejects a blank account id with a plain error", async () => {
    const { provider } = build();

    const error = await failureOf(provider.getAccessToken(" "));

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(RemoteLockTokenError);
  });

  it.each([
    ["a missing secret", null],
    ["no refresh token", { ...FRESH, refreshToken: undefined }],
    ["no access token", { ...FRESH, accessToken: "" }],
    ["a non-numeric expiry", { ...FRESH, expiresAt: "soon" }],
  ])("throws SECRET_INVALID for %s, without any value in the error", async (_label, secret) => {
    const { provider } = build({ secret });

    const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

    expect(error).toMatchObject({ code: "SECRET_INVALID", retryable: false });
    SECRETS.forEach((value) => expect(dumpOf(error)).not.toContain(value));
  });

  it("throws a retryable SECRET_STORE_ERROR when the secret cannot be read, hiding the underlying message", async () => {
    const { provider, store } = build();
    store.readSecret.mockRejectedValue(new Error(`AccessDenied for ${REFRESH}`));

    const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

    expect(error).toMatchObject({ code: "SECRET_STORE_ERROR", retryable: true });
    expect(dumpOf(error)).not.toContain(REFRESH);
  });
});

describe("RemoteLockTokenProvider refresh", () => {
  it("refreshes under a lease, saves the new tokens with the other fields kept, releases, and returns the new token", async () => {
    const { provider, store, lease, oauth } = build({ secret: { ...STALE, extra: "kept" } });

    await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(NEW_ACCESS);

    expect(lease.tryAcquire).toHaveBeenCalledWith(ACCOUNT_ID, "owner-1", { ttlMs: LEASE_TTL_MS });
    expect(oauth.refresh).toHaveBeenCalledWith(REFRESH);
    expect(lease.isHeldBy).toHaveBeenCalledWith(ACCOUNT_ID, "owner-1", { minRemainingMs: FENCE_MIN_REMAINING_MS });
    expect(store.writeSecret).toHaveBeenCalledTimes(1);
    expect(store.current()).toEqual({ ...ISSUED, extra: "kept" });
    expect(lease.release).toHaveBeenCalledWith(ACCOUNT_ID, "owner-1");
  });

  it("reads the secret again under the lease and skips the refresh when another run just did it", async () => {
    const { provider, store, oauth, lease } = build({ secret: STALE });
    store.readSecret.mockResolvedValueOnce({ ...STALE }).mockResolvedValueOnce({ ...FRESH });

    await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(ACCESS);

    expect(oauth.refresh).not.toHaveBeenCalled();
    expect(lease.release).toHaveBeenCalledTimes(1);
  });

  it("still returns the token when the lease cannot be released, because expiry frees it", async () => {
    const { provider, lease } = build();
    lease.release.mockRejectedValue(new Error("connection reset"));

    await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(NEW_ACCESS);
  });

  describe("when the lease cannot be requested", () => {
    it("keeps using the token while it is usable, without a refresh or a release", async () => {
      const { provider, lease, oauth } = build({ secret: STALE });
      lease.tryAcquire.mockRejectedValue(new Error("database down"));

      await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(ACCESS);

      expect(oauth.refresh).not.toHaveBeenCalled();
      expect(lease.release).not.toHaveBeenCalled();
    });

    it("throws a retryable LEASE_UNAVAILABLE once the token is no longer usable", async () => {
      const { provider, lease, oauth } = build({ secret: EXPIRED });
      lease.tryAcquire.mockRejectedValue(new Error("database down"));

      const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

      expect(error).toMatchObject({ code: "LEASE_UNAVAILABLE", retryable: true });
      expect(oauth.refresh).not.toHaveBeenCalled();
    });
  });
});

describe("RemoteLockTokenProvider when the lease is held", () => {
  const heldBySomeoneElse = async (lease) => lease.tryAcquire(ACCOUNT_ID, "other-run", { ttlMs: LEASE_TTL_MS });

  it("uses the old token without waiting while it is still usable", async () => {
    const { provider, lease, sleep, oauth } = build({ secret: STALE });
    await heldBySomeoneElse(lease);

    await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(ACCESS);

    expect(sleep).not.toHaveBeenCalled();
    expect(oauth.refresh).not.toHaveBeenCalled();
    expect(lease.release).not.toHaveBeenCalled();
  });

  it("waits with jitter and returns the token the holder saved", async () => {
    const { provider, lease, store, sleep } = build({ secret: EXPIRED, random: () => 0.5 });
    await heldBySomeoneElse(lease);
    sleep.mockImplementation(async () => {
      if (sleep.mock.calls.length === 2) store.replace({ ...ISSUED });
    });

    await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(NEW_ACCESS);

    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(LEASE_WAIT_BASE_MS + Math.floor(0.5 * LEASE_WAIT_JITTER_MS));
  });

  it("gives up with a retryable LEASE_UNAVAILABLE after the wait attempts, never refreshing", async () => {
    const { provider, lease, sleep, oauth } = build({ secret: EXPIRED });
    await heldBySomeoneElse(lease);

    const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

    expect(error).toMatchObject({ code: "LEASE_UNAVAILABLE", retryable: true });
    expect(sleep).toHaveBeenCalledTimes(LEASE_WAIT_ATTEMPTS);
    expect(oauth.refresh).not.toHaveBeenCalled();
  });
});

describe("RemoteLockTokenProvider refresh failures", () => {
  it("marks the account for reconnecting when invalid_grant is final, after a grace period", async () => {
    const { provider, accounts, oauth, sleep } = build({
      refresh: async () => {
        throw oauthError("AUTH", { status: 400, retryable: false, oauthError: "invalid_grant" });
      },
    });

    const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

    expect(error).toMatchObject({ code: "NEEDS_RECONNECT", retryable: false });
    expect(accounts.updateStatusIfCurrent).toHaveBeenCalledWith(ACCOUNT_ID, "CONNECTED", "EXPIRED_CREDENTIALS", {
      lastErrorCode: "REFRESH_TOKEN_REJECTED",
      lastErrorMessage: "RemoteLock rejected the refresh token.",
    });
    expect(accounts.current().status).toBe("EXPIRED_CREDENTIALS");
    expect(oauth.refresh).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(REFRESH_GRACE_MS);
  });

  it("uses the fresh token instead when another run changed the refresh token, and marks nothing", async () => {
    const { provider, accounts, store, sleep } = build({
      refresh: async () => {
        store.replace({ ...ISSUED });
        throw oauthError("AUTH", { status: 400, retryable: false, oauthError: "invalid_grant" });
      },
    });

    await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(NEW_ACCESS);

    expect(accounts.updateStatusIfCurrent).not.toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("uses the tokens that a slow holder saves during the grace period, and marks nothing", async () => {
    const { provider, accounts, store, sleep } = build({
      refresh: async () => {
        throw oauthError("AUTH", { status: 400, retryable: false, oauthError: "invalid_grant" });
      },
    });
    sleep.mockImplementation(async () => store.replace({ ...ISSUED }));

    await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(NEW_ACCESS);

    expect(accounts.updateStatusIfCurrent).not.toHaveBeenCalled();
  });

  it("does not use changed tokens that are no longer usable, and goes on to ask for a reconnect", async () => {
    const { provider, accounts, store } = build({
      refresh: async () => {
        store.replace(tokens({ refreshToken: "other-refresh", expiresAt: NOW + 10_000 }));
        throw oauthError("AUTH", { status: 400, retryable: false, oauthError: "invalid_grant" });
      },
    });

    const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

    expect(error).toMatchObject({ code: "NEEDS_RECONNECT" });
    expect(accounts.updateStatusIfCurrent).toHaveBeenCalledTimes(1);
  });

  it("does not flip an account that was disconnected in the meantime", async () => {
    const holder = {};
    const { provider, accounts } = build({
      refresh: async () => {
        holder.accounts.setStatus("DISCONNECTED");
        throw oauthError("AUTH", { status: 400, retryable: false, oauthError: "invalid_grant" });
      },
    });
    holder.accounts = accounts;

    const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

    expect(error).toMatchObject({ code: "NEEDS_RECONNECT" });
    expect(accounts.updateStatusIfCurrent).toHaveBeenCalledTimes(1);
    expect(accounts.current().status).toBe("DISCONNECTED");
  });

  it.each([
    ["invalid_client", oauthError("AUTH", { status: 401, retryable: false, oauthError: "invalid_client" })],
    ["invalid_request", oauthError("AUTH", { status: 400, retryable: false, oauthError: "invalid_request" })],
    ["an AUTH error with no name", oauthError("AUTH", { status: 403, retryable: false })],
    ["a non-retryable HTTP error", oauthError("HTTP", { status: 404, retryable: false })],
  ])("reports %s as a Domits configuration problem and leaves the host alone", async (_label, failure) => {
    const { provider, accounts } = build({
      refresh: async () => {
        throw failure;
      },
    });

    const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

    expect(error).toMatchObject({ code: "CONFIG_ERROR", retryable: false });
    expect(accounts.updateStatusIfCurrent).not.toHaveBeenCalled();
  });

  describe.each([
    ["TIMEOUT", () => oauthError("TIMEOUT", { retryable: true }), true],
    ["NETWORK", () => oauthError("NETWORK", { retryable: true }), true],
    ["RATE_LIMIT", () => oauthError("RATE_LIMIT", { status: 429, retryable: true }), true],
    ["a 503", () => oauthError("HTTP", { status: 503, retryable: true }), true],
    ["INVALID_RESPONSE", () => oauthError("INVALID_RESPONSE", { status: 200, retryable: false }), false],
  ])("%s during the refresh", (_label, makeFailure, retryable) => {
    const failing = (secret) =>
      build({
        secret,
        refresh: async () => {
          throw makeFailure();
        },
      });

    it("keeps using the old token while it is usable, without a second refresh or a status change", async () => {
      const { provider, oauth, accounts } = failing(STALE);

      await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(ACCESS);

      expect(oauth.refresh).toHaveBeenCalledTimes(1);
      expect(accounts.updateStatusIfCurrent).not.toHaveBeenCalled();
    });

    it("throws PROVIDER_UNAVAILABLE once the old token is no longer usable", async () => {
      const { provider, oauth, accounts } = failing(EXPIRED);

      const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

      expect(error).toMatchObject({ code: "PROVIDER_UNAVAILABLE", retryable });
      expect(oauth.refresh).toHaveBeenCalledTimes(1);
      expect(accounts.updateStatusIfCurrent).not.toHaveBeenCalled();
    });
  });

  it("wraps an unexpected error in a fixed UNEXPECTED error, and still releases the lease", async () => {
    const { provider, lease } = build({
      refresh: async () => {
        throw new TypeError(`bug with ${REFRESH}`);
      },
    });

    const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

    expect(error).toBeInstanceOf(RemoteLockTokenError);
    expect(error).toMatchObject({ code: "UNEXPECTED", retryable: false });
    expect(dumpOf(error)).not.toContain(REFRESH);
    expect(lease.release).toHaveBeenCalledTimes(1);
  });
});

describe("RemoteLockTokenProvider saving the new tokens", () => {
  it("retries a failed write with a growing wait and then succeeds", async () => {
    const { provider, store, sleep } = build();
    store.writeSecret.mockRejectedValueOnce(new Error("throttled")).mockImplementationOnce(async (_ref, next) => {
      store.replace({ ...next });
    });

    await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(NEW_ACCESS);

    expect(store.writeSecret).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(SECRET_WRITE_BACKOFF_MS);
  });

  it("throws a non-retryable SECRET_STORE_ERROR when every write fails, and returns no token", async () => {
    const { provider, store, lease } = build();
    store.writeSecret.mockRejectedValue(new Error(`denied ${NEW_REFRESH}`));

    const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

    expect(error).toMatchObject({ code: "SECRET_STORE_ERROR", retryable: false });
    expect(store.writeSecret).toHaveBeenCalledTimes(SECRET_WRITE_ATTEMPTS);
    expect(dumpOf(error)).not.toContain(NEW_REFRESH);
    expect(lease.release).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["the lease is no longer held", (lease) => lease.isHeldBy.mockResolvedValue(false)],
    ["the lease check fails", (lease) => lease.isHeldBy.mockRejectedValue(new Error("database down"))],
    ["the lease check hangs", (lease) => lease.isHeldBy.mockImplementation(() => new Promise(() => {}))],
  ])(
    "saves nothing, marks the account, logs one fixed event, releases and asks for a reconnect when %s",
    async (_label, breakLease) => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const others = ["log", "info", "error"].map((level) => jest.spyOn(console, level).mockImplementation(() => {}));
      const { provider, store, lease, accounts } = build({ secretCallTimeoutMs: 10 });
      breakLease(lease);

      const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

      expect(error).toMatchObject({ code: "NEEDS_RECONNECT", retryable: false });
      SECRETS.forEach((secret) => expect(dumpOf(error)).not.toContain(secret));
      expect(store.writeSecret).not.toHaveBeenCalled();
      expect(store.current()).toEqual(STALE);
      expect(accounts.updateStatusIfCurrent).toHaveBeenCalledWith(ACCOUNT_ID, "CONNECTED", "EXPIRED_CREDENTIALS", {
        lastErrorCode: "TOKENS_NOT_SAVED",
        lastErrorMessage: "RemoteLock tokens could not be saved.",
      });
      expect(accounts.current().status).toBe("EXPIRED_CREDENTIALS");
      expect(lease.release).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(JSON.parse(warn.mock.calls[0][0])).toEqual({
        event: "REMOTELOCK_TOKENS_NOT_SAVED",
        reason: "LEASE_LOST",
        integrationAccountId: ACCOUNT_ID,
      });
      const logged = JSON.stringify([warn, ...others].map((spy) => spy.mock.calls));
      SECRETS.forEach((secret) => expect(logged).not.toContain(secret));
      others.forEach((spy) => expect(spy).not.toHaveBeenCalled());
    }
  );

  it("leaves a concurrently disconnected account DISCONNECTED when the lease is lost", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const { provider, lease, accounts } = build();
    lease.isHeldBy.mockImplementation(async () => {
      accounts.setStatus("DISCONNECTED");
      return false;
    });

    const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

    expect(error).toMatchObject({ code: "NEEDS_RECONNECT", retryable: false });
    expect(accounts.current().status).toBe("DISCONNECTED");
  });

  it("still asks for a reconnect, without leaking the store error, when marking the account fails", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const { provider, lease, accounts } = build();
    lease.isHeldBy.mockResolvedValue(false);
    accounts.updateStatusIfCurrent.mockRejectedValue(new Error(`db down ${NEW_REFRESH}`));

    const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

    expect(error).toMatchObject({ code: "NEEDS_RECONNECT", retryable: false });
    expect(dumpOf(error)).not.toContain("db down");
    expect(lease.release).toHaveBeenCalledTimes(1);
  });

  it("logs nothing when the tokens were saved", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { provider } = build();

    await provider.getAccessToken(ACCOUNT_ID);

    expect(warn).not.toHaveBeenCalled();
  });

  it("checks the lease again before a retried write and stops once it is gone", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const { provider, store, lease } = build();
    store.writeSecret.mockRejectedValue(new Error("throttled"));
    lease.isHeldBy.mockResolvedValueOnce(true).mockResolvedValue(false);

    await expect(provider.getAccessToken(ACCOUNT_ID)).rejects.toMatchObject({ code: "NEEDS_RECONNECT" });

    expect(store.writeSecret).toHaveBeenCalledTimes(1);
    expect(lease.isHeldBy).toHaveBeenCalledTimes(2);
  });
});

describe("RemoteLockTokenProvider when newer tokens were saved during the refresh", () => {
  const savedMeanwhile = (stored) => {
    const context = build();
    context.oauth.refresh.mockImplementation(async () => {
      context.store.replace(stored);
      return ISSUED;
    });
    return context;
  };
  const newer = (overrides) => tokens({ accessToken: "stored-access", ...overrides });

  it.each([
    ["refresh token", newer({ refreshToken: "stored-refresh" }), "stored-access"],
    ["issue time", newer({ refreshIssuedAt: NOW - 1000 }), "stored-access"],
    [
      "refresh token, but no longer usable",
      newer({ refreshToken: "stored-refresh", expiresAt: NOW + 10_000 }),
      NEW_ACCESS,
    ],
  ])("does not overwrite a newer %s", async (_label, stored, expected) => {
    const { provider, store, lease } = savedMeanwhile(stored);

    await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(expected);

    expect(store.writeSecret).not.toHaveBeenCalled();
    expect(store.current()).toEqual(stored);
    expect(lease.release).toHaveBeenCalledTimes(1);
  });

  it("saves the new tokens anyway when the secret cannot be read again", async () => {
    const { provider, store } = build();
    store.readSecret
      .mockResolvedValueOnce({ ...STALE })
      .mockResolvedValueOnce({ ...STALE })
      .mockRejectedValueOnce(new Error("throttled"));

    await expect(provider.getAccessToken(ACCOUNT_ID)).resolves.toBe(NEW_ACCESS);

    expect(store.current()).toEqual(ISSUED);
  });
});

describe("RemoteLockTokenProvider secret store deadlines", () => {
  const never = () => new Promise(() => {});

  it.each([
    ["read", "readSecret", true, 1],
    ["write", "writeSecret", false, SECRET_WRITE_ATTEMPTS],
  ])("gives up on a %s that hangs, with retryable %s", async (_label, method, retryable, calls) => {
    const { provider, store, lease } = build({ secretCallTimeoutMs: 10 });
    store[method].mockImplementation(never);

    const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));

    expect(error).toMatchObject({ code: "SECRET_STORE_ERROR", retryable });
    expect(store[method]).toHaveBeenCalledTimes(calls);
    expect(lease.release).toHaveBeenCalledTimes(method === "writeSecret" ? 1 : 0);
  });
});

describe("RemoteLockTokenProvider secrets", () => {
  it("never puts a token in an error, a result other than the access token, or the console", async () => {
    const spies = ["log", "info", "warn", "error"].map((level) => jest.spyOn(console, level));
    const failures = [
      build({ secret: EXPIRED, refresh: async () => Promise.reject(oauthError("TIMEOUT", { retryable: true })) }),
      build({
        refresh: async () =>
          Promise.reject(oauthError("AUTH", { status: 400, retryable: false, oauthError: "invalid_grant" })),
      }),
      build({ refresh: async () => Promise.reject(oauthError("AUTH", { status: 401, retryable: false })) }),
    ];

    for (const { provider } of failures) {
      const error = await failureOf(provider.getAccessToken(ACCOUNT_ID));
      SECRETS.forEach((secret) => expect(dumpOf(error)).not.toContain(secret));
    }
    const success = await build().provider.getAccessToken(ACCOUNT_ID);

    expect(success).toBe(NEW_ACCESS);
    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});

describe("RemoteLockTokenProvider construction", () => {
  const dependencies = () => ({
    oauthClient: {},
    credentialStore: {},
    leaseRepository: {},
    accountRepository: {},
  });

  it.each(["oauthClient", "credentialStore", "leaseRepository", "accountRepository"])("requires %s", (name) => {
    expect(() => new RemoteLockTokenProvider({ ...dependencies(), [name]: undefined })).toThrow(name);
  });

  it("accepts a lease TTL up to the cap and rejects one above it", () => {
    expect(() => new RemoteLockTokenProvider({ ...dependencies(), leaseTtlMs: MAX_LEASE_TTL_MS })).not.toThrow();
    expect(() => new RemoteLockTokenProvider({ ...dependencies(), leaseTtlMs: MAX_LEASE_TTL_MS + 1 })).toThrow(
      "leaseTtlMs"
    );
  });

  it("rejects a lease TTL shorter than the worst case of one refresh, and accepts exactly that", () => {
    expect(() => new RemoteLockTokenProvider({ ...dependencies(), leaseTtlMs: 33_599 })).toThrow("worst case");
    expect(() => new RemoteLockTokenProvider({ ...dependencies(), leaseTtlMs: 33_600 })).not.toThrow();
  });

  it("counts a slower secret store in that worst case", () => {
    expect(() => new RemoteLockTokenProvider({ ...dependencies(), secretCallTimeoutMs: 4000 })).toThrow("worst case");
  });

  it.each([
    ["leaseTtlMs", 0],
    ["leaseWaitAttempts", 0],
    ["leaseWaitBaseMs", -1],
    ["leaseWaitJitterMs", 1.5],
    ["secretWriteAttempts", 0],
    ["secretWriteBackoffMs", "200"],
    ["secretCallTimeoutMs", 0],
    ["refreshGraceMs", 1.5],
  ])("rejects %s of %j", (name, value) => {
    expect(() => new RemoteLockTokenProvider({ ...dependencies(), [name]: value })).toThrow(name);
  });
});

describe("RemoteLock account constants", () => {
  const uiConstants = readFileSync(
    path.join(
      process.cwd(),
      "..",
      "frontend",
      "web",
      "src",
      "features",
      "hostdashboard",
      "hosthomeautomation",
      "constants",
      "homeAutomationConstants.js"
    ),
    "utf8"
  );
  const uiStatuses = [
    ...uiConstants
      .slice(
        uiConstants.indexOf("export const STATUS_PRESENTATION"),
        uiConstants.indexOf("UNKNOWN_STATUS_PRESENTATION")
      )
      .matchAll(/^ {2}([A-Z_]+): \{ tone:/gm),
  ].map((match) => match[1]);

  it("has exactly the statuses that the settings page can show, on the REMOTELOCK channel", () => {
    expect(REMOTELOCK_CHANNEL).toBe("REMOTELOCK");
    expect(uiStatuses).toHaveLength(7);
    expect(Object.values(REMOTELOCK_ACCOUNT_STATUS).sort()).toEqual([...uiStatuses].sort());
    expect(Object.keys(REMOTELOCK_ACCOUNT_STATUS).sort()).toEqual([...uiStatuses].sort());
  });
});
