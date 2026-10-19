import { afterEach, describe, expect, it, jest } from "@jest/globals";
import RemoteLockDevicesService, {
  DEVICES_BUDGET_MS,
  DEVICES_PER_PAGE,
  MAX_DEVICE_PAGES,
} from "../../functions/.shared/homeAutomation/services/remoteLockDevicesService.js";
import { RemoteLockApiError } from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockApiError.js";
import { RemoteLockTokenError } from "../../functions/.shared/homeAutomation/providers/remotelock/remoteLockTokenError.js";
import { RemoteLockConfigError } from "../../functions/.shared/homeAutomation/remoteLockConfig.js";

const USER = "user-1";
const TOKEN = "access-token-aaa";
const REFRESH = "refresh-token-bbb";

const account = (overrides = {}) => ({
  id: "account-1",
  userId: USER,
  channel: "REMOTELOCK",
  status: "CONNECTED",
  ...overrides,
});
const device = (n, overrides = {}) => ({
  providerDeviceId: `d-${n}`,
  deviceType: "lock",
  name: `Lock ${n}`,
  status: "ONLINE",
  batteryLevel: 80,
  lastSeenAt: 1000,
  ...overrides,
});
const page = (devices, totalPages = 1) => ({
  devices,
  page: 1,
  perPage: DEVICES_PER_PAGE,
  totalPages,
  totalCount: null,
});

const apiError = (code, { retryable = false, status = null, retryAfterMs = null } = {}) =>
  new RemoteLockApiError({ operation: "listDevices", code, status, retryable, retryAfterMs });

// The clock only moves when a page is read (by msPerRead) or the token is fetched (by tokenMs).
const build = ({
  rows = [account()],
  pages = [page([device(1)])],
  loadOAuthClient,
  msPerRead = 1,
  tokenMs = 0,
} = {}) => {
  let clock = 0;
  const accounts = {
    findByUserIdAndChannel: jest.fn(
      async (userId, channel) => rows.find((row) => row.userId === userId && row.channel === channel) ?? null
    ),
  };
  const apiClient = {
    listDevices: jest.fn(async (_token, { page: number }) => {
      clock += msPerRead;
      return pages[Math.min(number, pages.length) - 1];
    }),
  };
  const tokenProvider = {
    getAccessToken: jest.fn(async () => {
      clock += tokenMs;
      return TOKEN;
    }),
  };
  const createTokenProvider = jest.fn(() => tokenProvider);
  const service = new RemoteLockDevicesService({
    accounts,
    apiClient,
    createTokenProvider,
    loadOAuthClient: loadOAuthClient ?? (async () => ({})),
    now: () => clock,
  });
  return { service, accounts, apiClient, tokenProvider, createTokenProvider };
};

afterEach(() => jest.restoreAllMocks());

describe("RemoteLockDevicesService listDevices", () => {
  it("reads the page with the provider's token and maps the devices to the shape the page uses", async () => {
    const { service, apiClient, tokenProvider } = build({
      pages: [page([device(1), device(2, { name: null, batteryLevel: null, lastSeenAt: null, status: "UNKNOWN" })])],
    });

    const result = await service.listDevices(USER);

    expect(tokenProvider.getAccessToken).toHaveBeenCalledWith("account-1");
    expect(apiClient.listDevices).toHaveBeenCalledWith(TOKEN, { page: 1, perPage: DEVICES_PER_PAGE });
    expect(result).toEqual({
      statusCode: 200,
      response: {
        devices: [
          { id: "d-1", name: "Lock 1", type: "lock", status: "ONLINE", battery: 80, lastSeenAt: 1000 },
          { id: "d-2", name: null, type: "lock", status: "UNKNOWN", battery: null, lastSeenAt: null },
        ],
        truncated: false,
      },
    });
  });

  it("reads every page up to the last one, in order", async () => {
    const { service, apiClient } = build({
      pages: [page([device(1)], 3), page([device(2)], 3), page([device(3)], 3)],
    });

    const result = await service.listDevices(USER);

    expect(apiClient.listDevices).toHaveBeenCalledTimes(3);
    expect(result.response.devices.map((item) => item.id)).toEqual(["d-1", "d-2", "d-3"]);
    expect(result.response.truncated).toBe(false);
  });

  it.each([
    ["an empty list", [page([], 1)]],
    ["an empty page that totalPages says is followed by more", [page([], 5)]],
  ])("returns %s after one call", async (_label, pages) => {
    const { service, apiClient } = build({ pages });

    await expect(service.listDevices(USER)).resolves.toEqual({
      statusCode: 200,
      response: { devices: [], truncated: false },
    });
    expect(apiClient.listDevices).toHaveBeenCalledTimes(1);
  });

  it("stops at a short page when RemoteLock sends no page count", async () => {
    const full = Array.from({ length: DEVICES_PER_PAGE }, (_unused, index) => device(index));
    const { service, apiClient } = build({ pages: [page(full, null), page([device(99)], null)] });

    const result = await service.listDevices(USER);

    expect(apiClient.listDevices).toHaveBeenCalledTimes(2);
    expect(result.response.devices).toHaveLength(DEVICES_PER_PAGE + 1);
  });

  it("stops at the page cap and says the list is cut short", async () => {
    const { service, apiClient } = build({ pages: [page([device(1)], 50)] });

    const result = await service.listDevices(USER);

    expect(apiClient.listDevices).toHaveBeenCalledTimes(MAX_DEVICE_PAGES);
    expect(result.response.truncated).toBe(true);
  });

  it("stops when the time budget is spent and says the list is cut short", async () => {
    const { service, apiClient } = build({ pages: [page([device(1)], 5)], msPerRead: DEVICES_BUDGET_MS });

    const result = await service.listDevices(USER);

    expect(apiClient.listDevices).toHaveBeenCalledTimes(1);
    expect(result.response).toEqual({ devices: expect.any(Array), truncated: true });
  });

  it("counts the token step: when it uses most of the budget, one page is read and the list is cut short", async () => {
    const { service, apiClient } = build({ pages: [page([device(1)], 5)], tokenMs: DEVICES_BUDGET_MS - 1 });

    const result = await service.listDevices(USER);

    expect(apiClient.listDevices).toHaveBeenCalledTimes(1);
    expect(result.response).toEqual({ devices: [expect.any(Object)], truncated: true });
  });

  it("answers a retryable 503 and reads no page when the token step uses all of the budget", async () => {
    const { service, apiClient } = build({ tokenMs: DEVICES_BUDGET_MS });

    const result = await service.listDevices(USER);

    expect(result).toEqual({ statusCode: 503, response: { error: "PROVIDER_UNAVAILABLE", retryable: true } });
    expect(apiClient.listDevices).not.toHaveBeenCalled();
  });

  it.each([
    ["no account", []],
    ["a disconnected account", [account({ status: "DISCONNECTED" })]],
    ["a connecting account", [account({ status: "CONNECTING" })]],
    ["an account that has to reconnect", [account({ status: "EXPIRED_CREDENTIALS" })]],
    ["another host's account", [account({ userId: "someone-else" })]],
  ])("answers 409 NOT_CONNECTED for %s, without a token or a request", async (_label, rows) => {
    const { service, accounts, apiClient, createTokenProvider } = build({ rows });

    const result = await service.listDevices(USER);

    expect(result).toEqual({ statusCode: 409, response: { error: "NOT_CONNECTED", retryable: false } });
    expect(accounts.findByUserIdAndChannel).toHaveBeenCalledWith(USER, "REMOTELOCK");
    expect(createTokenProvider).not.toHaveBeenCalled();
    expect(apiClient.listDevices).not.toHaveBeenCalled();
  });

  it("answers 503 CONFIG_MISSING without asking for a token when RemoteLock is not configured", async () => {
    const { service, createTokenProvider } = build({
      loadOAuthClient: async () => {
        throw new RemoteLockConfigError();
      },
    });

    const result = await service.listDevices(USER);

    expect(result).toEqual({ statusCode: 503, response: { error: "CONFIG_MISSING", retryable: false } });
    expect(createTokenProvider).not.toHaveBeenCalled();
  });
});

describe("RemoteLockDevicesService error mapping", () => {
  const fromToken = (code, retryable) => () => new RemoteLockTokenError({ code, retryable });

  it.each([
    ["NEEDS_RECONNECT", fromToken("NEEDS_RECONNECT", false), 409, { error: "NEEDS_RECONNECT", retryable: false }],
    ["NOT_CONNECTED", fromToken("NOT_CONNECTED", false), 409, { error: "NOT_CONNECTED", retryable: false }],
    ["LEASE_UNAVAILABLE", fromToken("LEASE_UNAVAILABLE", true), 503, { error: "LEASE_UNAVAILABLE", retryable: true }],
    [
      "SECRET_STORE_ERROR",
      fromToken("SECRET_STORE_ERROR", true),
      503,
      { error: "SECRET_STORE_ERROR", retryable: true },
    ],
    [
      "a retryable PROVIDER_UNAVAILABLE",
      fromToken("PROVIDER_UNAVAILABLE", true),
      503,
      { error: "PROVIDER_UNAVAILABLE", retryable: true },
    ],
    ["CONFIG_ERROR", fromToken("CONFIG_ERROR", false), 502, { error: "CONFIG_ERROR", retryable: false }],
    ["SECRET_INVALID", fromToken("SECRET_INVALID", false), 500, { error: "SECRET_INVALID", retryable: false }],
    ["UNEXPECTED", fromToken("UNEXPECTED", false), 500, { error: "INTERNAL_ERROR", retryable: false }],
  ])("maps the token error %s", async (_label, makeError, statusCode, body) => {
    const { service, tokenProvider, apiClient } = build();
    tokenProvider.getAccessToken.mockRejectedValue(makeError());

    await expect(service.listDevices(USER)).resolves.toEqual({ statusCode, response: body });
    expect(apiClient.listDevices).not.toHaveBeenCalled();
  });

  it.each([
    ["AUTH", apiError("AUTH", { status: 401 }), 502, { error: "PROVIDER_AUTH", retryable: false }],
    [
      "RATE_LIMIT with a reset time",
      apiError("RATE_LIMIT", { status: 429, retryable: true, retryAfterMs: 1500 }),
      503,
      { error: "RATE_LIMITED", retryable: true, retryAfterSeconds: 2 },
    ],
    [
      "RATE_LIMIT without one",
      apiError("RATE_LIMIT", { status: 429, retryable: true }),
      503,
      { error: "RATE_LIMITED", retryable: true },
    ],
    ["TIMEOUT", apiError("TIMEOUT", { retryable: true }), 503, { error: "PROVIDER_UNAVAILABLE", retryable: true }],
    [
      "a 503",
      apiError("HTTP", { status: 503, retryable: true }),
      503,
      { error: "PROVIDER_UNAVAILABLE", retryable: true },
    ],
    ["a 404", apiError("HTTP", { status: 404 }), 502, { error: "PROVIDER_ERROR", retryable: false }],
    [
      "INVALID_RESPONSE",
      apiError("INVALID_RESPONSE", { status: 200 }),
      502,
      { error: "PROVIDER_ERROR", retryable: false },
    ],
  ])("maps the API error %s", async (_label, error, statusCode, body) => {
    const { service, apiClient } = build();
    apiClient.listDevices.mockRejectedValue(error);

    await expect(service.listDevices(USER)).resolves.toEqual({ statusCode, response: body });
  });

  it("answers a fixed 500 and never puts a token or an error message in a response or a log", async () => {
    const spies = ["log", "info", "warn", "error"].map((level) =>
      jest.spyOn(console, level).mockImplementation(() => {})
    );
    const failing = build();
    failing.apiClient.listDevices.mockRejectedValue(new TypeError(`boom ${TOKEN} ${REFRESH}`));
    const tokenFailing = build();
    tokenFailing.tokenProvider.getAccessToken.mockRejectedValue(new TypeError(`boom ${TOKEN}`));
    const success = await build().service.listDevices(USER);

    const results = [await failing.service.listDevices(USER), await tokenFailing.service.listDevices(USER), success];

    expect(results.slice(0, 2)).toEqual(
      Array(2).fill({ statusCode: 500, response: { error: "INTERNAL_ERROR", retryable: false } })
    );
    expect(JSON.stringify([results, spies.map((spy) => spy.mock.calls)])).not.toMatch(
      new RegExp(`${TOKEN}|${REFRESH}`)
    );
  });
});
