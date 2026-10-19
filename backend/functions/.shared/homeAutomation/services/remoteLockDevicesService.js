import { REMOTELOCK_ACCOUNT_STATUS as STATUS, REMOTELOCK_CHANNEL } from "../homeAutomationConstants.js";
import { REMOTELOCK_ERROR_CODE as API_CODE, RemoteLockApiError } from "../providers/remotelock/remoteLockApiError.js";
import { RemoteLockTokenError } from "../providers/remotelock/remoteLockTokenError.js";
import { RemoteLockConfigError } from "../remoteLockConfig.js";

// RemoteLock allows 50 devices a page and 120 requests a minute per account; the API Gateway timeout is 29 s.
export const DEVICES_PER_PAGE = 50;
export const MAX_DEVICE_PAGES = 10;
export const DEVICES_BUDGET_MS = 15_000;

const reply = (statusCode, response) => ({ statusCode, response });
// Fixed codes only: nothing the provider or the secret store said goes into a response.
const failure = (statusCode, error, retryable = false) => reply(statusCode, { error, retryable });

const TOKEN_FAILURE_STATUS = Object.freeze({
  NOT_CONNECTED: 409,
  NEEDS_RECONNECT: 409,
  LEASE_UNAVAILABLE: 503,
  SECRET_STORE_ERROR: 503,
  PROVIDER_UNAVAILABLE: 503,
  CONFIG_ERROR: 502,
  SECRET_INVALID: 500,
});

const mapTokenFailure = (error) => {
  const statusCode = TOKEN_FAILURE_STATUS[error.code];
  return statusCode ? failure(statusCode, error.code, error.retryable) : failure(500, "INTERNAL_ERROR");
};

const mapApiFailure = (error) => {
  if (error.code === API_CODE.RATE_LIMIT) {
    const retryAfter = error.retryAfterMs === null ? {} : { retryAfterSeconds: Math.ceil(error.retryAfterMs / 1000) };
    return reply(503, { error: "RATE_LIMITED", retryable: true, ...retryAfter });
  }
  if (error.code === API_CODE.AUTH) return failure(502, "PROVIDER_AUTH");
  return error.retryable ? failure(503, "PROVIDER_UNAVAILABLE", true) : failure(502, "PROVIDER_ERROR");
};

const toResponseDevice = (device) => ({
  id: device.providerDeviceId,
  name: device.name,
  type: device.deviceType,
  status: device.status,
  battery: device.batteryLevel,
  lastSeenAt: device.lastSeenAt,
});

// Reads the host's devices live from RemoteLock; nothing is stored, because devices are not mapped to properties yet.
export default class RemoteLockDevicesService {
  #accounts;
  #apiClient;
  #createTokenProvider;
  #loadOAuthClient;
  #now;

  constructor({ accounts, apiClient, createTokenProvider, loadOAuthClient, now = Date.now }) {
    this.#accounts = accounts;
    this.#apiClient = apiClient;
    this.#createTokenProvider = createTokenProvider;
    this.#loadOAuthClient = loadOAuthClient;
    this.#now = now;
  }

  async listDevices(userId) {
    // Started here, not at the first page: the token step can be slow, and the whole request has to fit the gateway.
    const startedAt = this.#now();
    try {
      const account = await this.#accounts.findByUserIdAndChannel(userId, REMOTELOCK_CHANNEL);
      if (account?.status !== STATUS.CONNECTED) return failure(409, "NOT_CONNECTED");

      // Loaded first so a missing configuration is a clear 503 and not a failed refresh.
      const tokenProvider = this.#createTokenProvider(await this.#loadOAuthClient());
      const token = await tokenProvider.getAccessToken(account.id);
      const list = await this.#readDevices(token, startedAt);
      return list ? reply(200, list) : failure(503, "PROVIDER_UNAVAILABLE", true);
    } catch (error) {
      return this.#failureFor(error);
    }
  }

  // Stops at the page cap or the time budget and says so, so a partial list is never mistaken for the whole one.
  async #readDevices(token, startedAt) {
    const devices = [];
    for (let page = 1; page <= MAX_DEVICE_PAGES; page += 1) {
      if (this.#now() - startedAt >= DEVICES_BUDGET_MS) {
        // Null when nothing was read: an empty list marked truncated would look like a host without devices.
        return page === 1 ? null : { devices, truncated: true };
      }
      const result = await this.#apiClient.listDevices(token, { page, perPage: DEVICES_PER_PAGE });
      devices.push(...result.devices.map(toResponseDevice));
      const isLastPage =
        result.devices.length === 0 ||
        (result.totalPages === null ? result.devices.length < DEVICES_PER_PAGE : page >= result.totalPages);
      if (isLastPage) return { devices, truncated: false };
    }
    return { devices, truncated: true };
  }

  #failureFor(error) {
    if (error instanceof RemoteLockConfigError) return failure(503, "CONFIG_MISSING");
    if (error instanceof RemoteLockTokenError) return mapTokenFailure(error);
    if (error instanceof RemoteLockApiError) return mapApiFailure(error);
    // The name only: a message from the store or the provider can quote a token.
    console.error(JSON.stringify({ event: "REMOTELOCK_DEVICES_FAILED", errorName: error?.name ?? null }));
    return failure(500, "INTERNAL_ERROR");
  }
}
