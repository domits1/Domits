import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { createHash } from "node:crypto";
import RemoteLockConnectionService, {
  PENDING_CONNECT_MS,
} from "../../functions/.shared/homeAutomation/services/remoteLockConnectionService.js";
import { LEASE_WAIT_ATTEMPTS } from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockTokenProvider.js";
import { RemoteLockOAuthError } from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockOAuthError.js";
import { RemoteLockConfigError } from "../../functions/.shared/homeAutomation/remoteLockConfig.js";

const NOW = 1_800_000_000_000;
const USER = "user-1";
const REF = "domits/remotelock/user-1/account-1";
const STATE = "state-value-123";
const CODE = "auth-code-xyz";
const ACCESS = "access-token-aaa";
const REFRESH = "refresh-token-bbb";
const NEW_ACCESS = "access-token-ccc";
const NEW_REFRESH = "refresh-token-ddd";
const STATE_HASH = createHash("sha256").update(STATE).digest("hex");
const ISSUED = {
  accessToken: NEW_ACCESS,
  refreshToken: NEW_REFRESH,
  tokenType: "Bearer",
  expiresAt: NOW + 7_200_000,
  refreshIssuedAt: NOW,
};

const row = (overrides = {}) => ({
  id: "account-1",
  userId: USER,
  channel: "REMOTELOCK",
  status: "CONNECTING",
  credentialsRef: REF,
  lastSuccessfulSyncAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});
const pending = (overrides = {}) => ({ stateHash: STATE_HASH, expiresAt: NOW + PENDING_CONNECT_MS, ...overrides });
const connected = () => row({ status: "CONNECTED", lastSuccessfulSyncAt: NOW - 1000 });

const makeAccounts = (rows) => {
  const byId = new Map(rows.map((item) => [item.id, { ...item }]));
  return {
    byId,
    findByUserIdAndChannel: jest.fn(
      async (userId, channel) =>
        [...byId.values()].find((item) => item.userId === userId && item.channel === channel) ?? null
    ),
    create: jest.fn(async (item) => byId.set(item.id, { ...item })),
    update: jest.fn(async (id, patch) => byId.set(id, { ...byId.get(id), ...patch, updatedAt: NOW })),
    disconnect: jest.fn(async (id) =>
      byId.set(id, { ...byId.get(id), status: "DISCONNECTED", credentialsRef: null, externalAccountId: null })
    ),
  };
};

const makeStore = (initial) => {
  const secrets = new Map(Object.entries(initial));
  return {
    secrets,
    ensureSecret: jest.fn(async ({ userId, integrationAccountId, payload }) => {
      const ref = `domits/remotelock/${userId}/${integrationAccountId}`;
      secrets.set(ref, payload);
      return ref;
    }),
    readSecretOrNull: jest.fn(async (ref) => secrets.get(ref) ?? null),
    writeSecret: jest.fn(async (ref, payload) => secrets.set(ref, payload)),
  };
};

// Held until it expires, released only by its owner; the clock is frozen at NOW.
const makeLease = () => {
  const leases = new Map();
  return {
    tryAcquire: jest.fn(async (id, owner, { ttlMs }) => {
      if (leases.get(id)?.expiresAt > NOW) return false;
      leases.set(id, { owner, expiresAt: NOW + ttlMs });
      return true;
    }),
    release: jest.fn(async (id, owner) => {
      if (leases.get(id)?.owner === owner) leases.set(id, { owner, expiresAt: 0 });
    }),
  };
};

const oauthError = (code, { retryable = false, oauthError: name = null } = {}) =>
  new RemoteLockOAuthError({ operation: "exchangeCode", code, status: 400, retryable, oauthError: name });

const build = ({ rows = [row()], secrets = { [REF]: { pendingConnect: pending() } }, loadOAuthClient } = {}) => {
  const accounts = makeAccounts(rows);
  const store = makeStore(secrets);
  const lease = makeLease();
  const oauth = {
    buildAuthorizeUrl: jest.fn((state) => `https://connect.example.test/oauth/authorize?state=${state}`),
    exchangeCode: jest.fn(async () => ISSUED),
    revoke: jest.fn(async () => {}),
  };
  const sleep = jest.fn(async () => {});
  let sequence = 0;
  const service = new RemoteLockConnectionService({
    accounts,
    credentialStore: store,
    leaseRepository: lease,
    loadOAuthClient: loadOAuthClient ?? (async () => oauth),
    now: () => NOW,
    sleep,
    random: () => 0,
    randomId: () => `id-${(sequence += 1)}`,
    newState: () => STATE,
  });
  return { service, accounts, store, lease, oauth, sleep };
};

afterEach(() => jest.restoreAllMocks());

describe("RemoteLockConnectionService startConnect", () => {
  it("creates a CONNECTING row for the user and stores only the hash of the state, with its expiry", async () => {
    const { service, accounts, store } = build({ rows: [], secrets: {} });

    const result = await service.startConnect(USER);

    expect(result).toEqual({
      statusCode: 200,
      response: { status: "CONNECTING", authorizeUrl: `https://connect.example.test/oauth/authorize?state=${STATE}` },
    });
    expect(accounts.byId.get("id-1")).toMatchObject({
      userId: USER,
      channel: "REMOTELOCK",
      status: "CONNECTING",
      displayName: "RemoteLock",
      externalAccountId: null,
      credentialsRef: "domits/remotelock/user-1/id-1",
    });
    expect(store.secrets.get("domits/remotelock/user-1/id-1")).toEqual({ pendingConnect: pending() });
    expect(JSON.stringify([...store.secrets.values()])).not.toContain(STATE);
  });

  it("reuses the row and secret of an account that has to reconnect", async () => {
    const { service, accounts, store } = build({
      rows: [row({ status: "EXPIRED_CREDENTIALS" })],
      secrets: { [REF]: { accessToken: ACCESS } },
    });

    const result = await service.startConnect(USER);

    expect(result.statusCode).toBe(200);
    expect(accounts.create).not.toHaveBeenCalled();
    expect(accounts.byId.get("account-1")).toMatchObject({ status: "CONNECTING", credentialsRef: REF });
    expect(store.secrets.get(REF)).toEqual({ pendingConnect: pending() });
  });

  it("refuses with 409 while connected, and leaves the tokens alone", async () => {
    const { service, store, accounts } = build({ rows: [connected()], secrets: { [REF]: { accessToken: ACCESS } } });

    const result = await service.startConnect(USER);

    expect(result).toEqual({ statusCode: 409, response: { error: "ALREADY_CONNECTED", retryable: false } });
    expect(store.ensureSecret).not.toHaveBeenCalled();
    expect(accounts.update).not.toHaveBeenCalled();
    expect(store.secrets.get(REF)).toEqual({ accessToken: ACCESS });
  });

  it("answers a retryable 503 and writes nothing while another run holds the lease", async () => {
    const { service, lease, store, accounts } = build();
    await lease.tryAcquire("account-1", "complete-run", { ttlMs: 45_000 });

    const result = await service.startConnect(USER);

    expect(result).toEqual({ statusCode: 503, response: { error: "LEASE_UNAVAILABLE", retryable: true } });
    expect(store.ensureSecret).not.toHaveBeenCalled();
    expect(accounts.update).not.toHaveBeenCalled();
  });

  it("reads the row again under the lease, so a connection completed meanwhile keeps its tokens", async () => {
    const { service, accounts, store } = build({ secrets: { [REF]: { accessToken: ACCESS } } });
    accounts.findByUserIdAndChannel.mockResolvedValueOnce(row()).mockResolvedValueOnce(connected());

    const result = await service.startConnect(USER);

    expect(result.statusCode).toBe(409);
    expect(store.ensureSecret).not.toHaveBeenCalled();
    expect(store.secrets.get(REF)).toEqual({ accessToken: ACCESS });
  });

  it("answers 503 CONFIG_MISSING without touching anything when RemoteLock is not configured", async () => {
    const { service, store, accounts } = build({
      loadOAuthClient: async () => {
        throw new RemoteLockConfigError();
      },
    });

    const result = await service.startConnect(USER);

    expect(result).toEqual({ statusCode: 503, response: { error: "CONFIG_MISSING", retryable: false } });
    expect(store.ensureSecret).not.toHaveBeenCalled();
    expect(accounts.update).not.toHaveBeenCalled();
  });

  it("answers a retryable 503 and saves no row when the secret cannot be stored", async () => {
    const { service, store, accounts } = build({ rows: [], secrets: {} });
    store.ensureSecret.mockRejectedValue(new Error(`denied for ${STATE}`));

    const result = await service.startConnect(USER);

    expect(result).toEqual({ statusCode: 503, response: { error: "SECRET_STORE_ERROR", retryable: true } });
    expect(accounts.create).not.toHaveBeenCalled();
  });
});

describe("RemoteLockConnectionService completeConnect", () => {
  it("exchanges the code, saves the tokens in the shape the token provider reads, and marks the row CONNECTED", async () => {
    const { service, store, accounts, oauth, lease } = build();

    const result = await service.completeConnect(USER, { code: CODE, state: STATE });

    expect(result).toEqual({ statusCode: 200, response: { status: "CONNECTED", lastSyncAt: null } });
    expect(oauth.exchangeCode).toHaveBeenCalledWith(CODE);
    expect(store.secrets.get(REF)).toEqual(ISSUED);
    expect(accounts.byId.get("account-1").status).toBe("CONNECTED");
    expect(lease.release).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a wrong state", pending(), "other-state", "STATE_INVALID"],
    ["an expired state", pending({ expiresAt: NOW }), STATE, "STATE_EXPIRED"],
    ["a state without an expiry", pending({ expiresAt: undefined }), STATE, "STATE_EXPIRED"],
    ["no pending state", undefined, STATE, "STATE_INVALID"],
  ])("rejects %s with 409 and exchanges nothing", async (_label, stored, state, error) => {
    const { service, oauth, accounts } = build({ secrets: { [REF]: { pendingConnect: stored } } });

    const result = await service.completeConnect(USER, { code: CODE, state });

    expect(result).toEqual({ statusCode: 409, response: { error, retryable: false } });
    expect(oauth.exchangeCode).not.toHaveBeenCalled();
    expect(accounts.byId.get("account-1").status).toBe("CONNECTING");
  });

  it("accepts a state only once", async () => {
    const { service, oauth, accounts } = build();
    await service.completeConnect(USER, { code: CODE, state: STATE });
    accounts.byId.set("account-1", { ...accounts.byId.get("account-1"), status: "CONNECTING" });

    const second = await service.completeConnect(USER, { code: CODE, state: STATE });

    expect(second.statusCode).toBe(409);
    expect(oauth.exchangeCode).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no account", []],
    ["an account that is not connecting", [connected()]],
  ])("answers 409 for %s", async (_label, rows) => {
    const { service, oauth } = build({ rows });

    const result = await service.completeConnect(USER, { code: CODE, state: STATE });

    expect(result.response.error).toBe("STATE_INVALID");
    expect(oauth.exchangeCode).not.toHaveBeenCalled();
  });

  it.each([
    [{ code: CODE }],
    [{ state: STATE }],
    [{ code: " ", state: STATE }],
    [{ code: 5, state: STATE }],
    [undefined],
  ])("answers 400 for the body %j", async (body) => {
    const { service, store } = build();

    const result = await service.completeConnect(USER, body);

    expect(result).toEqual({ statusCode: 400, response: { error: "MISSING_FIELD", retryable: false } });
    expect(store.readSecretOrNull).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid_grant", oauthError("AUTH", { oauthError: "invalid_grant" }), 400, "CODE_REJECTED"],
    ["a timeout", oauthError("TIMEOUT", { retryable: true }), 503, "PROVIDER_UNAVAILABLE"],
    ["invalid_client", oauthError("AUTH", { oauthError: "invalid_client" }), 502, "PROVIDER_ERROR"],
  ])("maps %s from the exchange to a fixed code and uses the state up", async (_label, failure, statusCode, error) => {
    const { service, accounts, oauth } = build();
    oauth.exchangeCode.mockRejectedValue(failure);

    const result = await service.completeConnect(USER, { code: CODE, state: STATE });
    const again = await service.completeConnect(USER, { code: CODE, state: STATE });

    expect(result).toEqual({ statusCode, response: { error, retryable: statusCode === 503 } });
    expect(again.response.error).toBe("STATE_INVALID");
    expect(accounts.byId.get("account-1").status).toBe("CONNECTING");
  });

  it("answers a retryable 503 and does not exchange when the lease is held by another run", async () => {
    const { service, lease, oauth, sleep } = build();
    await lease.tryAcquire("account-1", "other-run", { ttlMs: 45_000 });

    const result = await service.completeConnect(USER, { code: CODE, state: STATE });

    expect(result).toEqual({ statusCode: 503, response: { error: "LEASE_UNAVAILABLE", retryable: true } });
    expect(oauth.exchangeCode).not.toHaveBeenCalled();
    expect(sleep).toHaveBeenCalledTimes(LEASE_WAIT_ATTEMPTS - 1);
  });
});

describe("RemoteLockConnectionService disconnect", () => {
  it.each([
    ["no account", [], "NOT_CONNECTED"],
    ["a disconnected account", [row({ status: "DISCONNECTED", credentialsRef: null })], "DISCONNECTED"],
  ])("answers 200 for %s without taking the lease", async (_label, rows, status) => {
    const { service, lease } = build({ rows });

    const result = await service.disconnect(USER);

    expect(result).toEqual({ statusCode: 200, response: { status, lastSyncAt: null } });
    expect(lease.tryAcquire).not.toHaveBeenCalled();
  });

  it("takes the lease, revokes the refresh token, scrubs the secret and disconnects the row", async () => {
    const { service, lease, oauth, store, accounts } = build({
      rows: [connected()],
      secrets: { [REF]: { accessToken: ACCESS, refreshToken: REFRESH } },
    });

    const result = await service.disconnect(USER);

    expect(result).toEqual({ statusCode: 200, response: { status: "DISCONNECTED", lastSyncAt: NOW - 1000 } });
    expect(lease.tryAcquire).toHaveBeenCalledWith("account-1", "id-1", { ttlMs: 45_000 });
    expect(oauth.revoke).toHaveBeenCalledWith(REFRESH);
    expect(store.secrets.get(REF)).toEqual({});
    expect(accounts.byId.get("account-1").status).toBe("DISCONNECTED");
    expect(lease.release).toHaveBeenCalledWith("account-1", "id-1");
  });

  it("answers a retryable 503 and changes nothing while another run holds the lease", async () => {
    const { service, lease, oauth, store, accounts, sleep } = build({
      rows: [connected()],
      secrets: { [REF]: { accessToken: ACCESS, refreshToken: REFRESH } },
    });
    await lease.tryAcquire("account-1", "refresh-run", { ttlMs: 45_000 });

    const result = await service.disconnect(USER);

    expect(result).toEqual({ statusCode: 503, response: { error: "LEASE_UNAVAILABLE", retryable: true } });
    expect(sleep).toHaveBeenCalledTimes(LEASE_WAIT_ATTEMPTS - 1);
    expect(oauth.revoke).not.toHaveBeenCalled();
    expect(store.writeSecret).not.toHaveBeenCalled();
    expect(accounts.disconnect).not.toHaveBeenCalled();
  });

  it("still disconnects when the revoke fails or RemoteLock is not configured", async () => {
    const failing = build({ rows: [connected()], secrets: { [REF]: { refreshToken: REFRESH } } });
    failing.oauth.revoke.mockRejectedValue(new Error(`revoke failed for ${REFRESH}`));
    const unconfigured = build({
      rows: [connected()],
      secrets: { [REF]: { refreshToken: REFRESH } },
      loadOAuthClient: async () => {
        throw new RemoteLockConfigError();
      },
    });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const results = await Promise.all([failing.service.disconnect(USER), unconfigured.service.disconnect(USER)]);

    expect(results.map((result) => result.statusCode)).toEqual([200, 200]);
    expect(failing.accounts.byId.get("account-1").status).toBe("DISCONNECTED");
    expect(unconfigured.accounts.byId.get("account-1").status).toBe("DISCONNECTED");
    expect(JSON.stringify(warn.mock.calls)).not.toContain(REFRESH);
  });

  it("keeps the row connected, and releases the lease, when the secret cannot be scrubbed", async () => {
    const { service, store, accounts, lease } = build({
      rows: [connected()],
      secrets: { [REF]: { refreshToken: REFRESH } },
    });
    store.writeSecret.mockRejectedValue(new Error("denied"));

    const result = await service.disconnect(USER);

    expect(result).toEqual({ statusCode: 503, response: { error: "SECRET_STORE_ERROR", retryable: true } });
    expect(accounts.disconnect).not.toHaveBeenCalled();
    expect(lease.release).toHaveBeenCalledTimes(1);
  });
});

describe("RemoteLockConnectionService getStatus", () => {
  it.each([
    ["no account", [], "NOT_CONNECTED", null],
    ["a connected account", [connected()], "CONNECTED", NOW - 1000],
    ["a recent connect attempt", [row({ updatedAt: NOW - PENDING_CONNECT_MS + 1 })], "CONNECTING", null],
    ["an abandoned connect attempt", [row({ updatedAt: NOW - PENDING_CONNECT_MS })], "NOT_CONNECTED", null],
    ["an account that has to reconnect", [row({ status: "EXPIRED_CREDENTIALS" })], "EXPIRED_CREDENTIALS", null],
  ])("reports %s", async (_label, rows, status, lastSyncAt) => {
    const { service } = build({ rows });

    await expect(service.getStatus(USER)).resolves.toEqual({ statusCode: 200, response: { status, lastSyncAt } });
  });
});

describe("RemoteLockConnectionService owner and secrets", () => {
  it("only ever reads the row of the user it is given", async () => {
    const { service, accounts } = build({ rows: [row({ userId: "someone-else", status: "CONNECTED" })] });

    const status = await service.getStatus(USER);
    const disconnect = await service.disconnect(USER);

    expect(status.response.status).toBe("NOT_CONNECTED");
    expect(disconnect.response.status).toBe("NOT_CONNECTED");
    expect(accounts.findByUserIdAndChannel).toHaveBeenCalledWith(USER, "REMOTELOCK");
    expect(accounts.disconnect).not.toHaveBeenCalled();
  });

  it("never puts a token, the code, the hash or a secret in a response or a log", async () => {
    const spies = ["log", "info", "warn", "error"].map((level) =>
      jest.spyOn(console, level).mockImplementation(() => {})
    );
    const flow = build({ rows: [], secrets: {} });
    const responses = [await flow.service.startConnect(USER)];
    responses.push(await flow.service.completeConnect(USER, { code: CODE, state: "wrong" }));
    responses.push(await flow.service.completeConnect(USER, { code: CODE, state: STATE }));
    responses.push(await flow.service.getStatus(USER));
    responses.push(await flow.service.disconnect(USER));
    const broken = build();
    broken.store.readSecretOrNull.mockRejectedValue(new Error(`boom ${REFRESH} ${CODE} ${STATE_HASH}`));
    responses.push(await broken.service.completeConnect(USER, { code: CODE, state: STATE }));
    const crashing = build();
    crashing.accounts.findByUserIdAndChannel.mockRejectedValue(new Error(`boom ${REFRESH} ${CODE}`));
    responses.push(await crashing.service.getStatus(USER));

    const output = JSON.stringify([responses, spies.map((spy) => spy.mock.calls)]);

    [ACCESS, REFRESH, NEW_ACCESS, NEW_REFRESH, CODE, STATE_HASH].forEach((secret) =>
      expect(output).not.toContain(secret)
    );
    expect(JSON.stringify(responses.slice(1))).not.toContain(STATE);
  });
});
