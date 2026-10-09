import { REMOTELOCK_ERROR_CODE as CODE, RemoteLockApiError } from "./remoteLockApiError.js";
import { mapAccess, mapAccessGuest, mapDevicePage } from "./remoteLockMapper.js";

export const REMOTELOCK_BASE_URL = "https://api.remotelock.com";
const ACCEPT = "application/vnd.lockstate+json; version=1";
const MAX_PER_PAGE = 50;
const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

const requireText = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
};

// A lock-local date-time has no time zone ("2026-10-12T15:00:00"). Only the format and the calendar are
// checked, with plain arithmetic; the value is never converted, so it reaches RemoteLock as given.
const requireLocalDateTime = (value, label) => {
  const parts = LOCAL_DATE_TIME.exec(value)?.slice(1).map(Number);
  const [year, month, day, hour, minute, second] = parts ?? [];
  const probe = parts ? new Date(Date.UTC(year, month - 1, day, hour, minute, second)) : null;
  const isRealDateTime =
    probe &&
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day &&
    probe.getUTCHours() === hour &&
    probe.getUTCMinutes() === minute &&
    probe.getUTCSeconds() === second;
  if (!isRealDateTime) {
    throw new Error(`${label} must be a local date-time like 2026-10-12T15:00:00, without a time zone.`);
  }
  return value;
};

const requireWindow = (startsAt, endsAt) => {
  requireLocalDateTime(startsAt, "startsAt");
  requireLocalDateTime(endsAt, "endsAt");
  if (endsAt <= startsAt) throw new Error("endsAt must be after startsAt.");
};

const requirePositiveInteger = (value, label) => {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${label} must be a positive integer.`);
  return value;
};

// Contract: the access token is passed on every call (no login or refresh here). A failed call throws a
// RemoteLockApiError, never the response body: AUTH (401/403) is not retryable, the caller refreshes the token;
// RATE_LIMIT (429) is retryable, retryAfterMs is the wait in ms until X-RateLimit-Reset, or null without it;
// HTTP is retryable for 5xx only; TIMEOUT and NETWORK are retryable; INVALID_RESPONSE (a 2xx that cannot be
// read) is not. Bad arguments throw a plain Error before any request.
// Pin rule: generate_pin asks RemoteLock for a pin, but no method returns, stores or logs it; results are
// built from named fields only, see the mapper.
export class RemoteLockApiClient {
  constructor({ baseUrl = REMOTELOCK_BASE_URL, fetchImpl = fetch, timeoutMs = 10000, now = Date.now } = {}) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.now = now;
  }

  async listDevices(token, { page = 1, perPage = MAX_PER_PAGE } = {}) {
    const accessToken = requireText(token, "token");
    requirePositiveInteger(page, "page");
    if (requirePositiveInteger(perPage, "perPage") > MAX_PER_PAGE) {
      throw new Error(`perPage can be at most ${MAX_PER_PAGE}.`);
    }
    const body = await this.send("listDevices", "GET", `/devices?page=${page}&per_page=${perPage}`, accessToken);
    return this.mapOrFail("listDevices", mapDevicePage(body));
  }

  // The caller must check for an existing guest before retrying this after a timeout or a 5xx: the first
  // attempt may have created the guest (and its pin) at RemoteLock, and a retry would create a second one.
  async createAccessGuest(token, { name, startsAt, endsAt } = {}) {
    const accessToken = requireText(token, "token");
    const guestName = requireText(name, "name");
    requireWindow(startsAt, endsAt);
    const body = await this.send("createAccessGuest", "POST", "/access_persons", accessToken, {
      type: "access_guest",
      attributes: { name: guestName, starts_at: startsAt, ends_at: endsAt, generate_pin: true },
    });
    return this.mapOrFail("createAccessGuest", mapAccessGuest(body?.data));
  }

  async grantAccess(token, accessPersonId, { accessibleId, accessibleType } = {}) {
    const accessToken = requireText(token, "token");
    const lockId = requireText(accessibleId, "accessibleId");
    const lockType = requireText(accessibleType, "accessibleType");
    const body = await this.send("grantAccess", "POST", `${this.guestPath(accessPersonId)}/accesses`, accessToken, {
      attributes: { accessible_id: lockId, accessible_type: lockType },
    });
    return this.mapOrFail("grantAccess", mapAccess(body?.data));
  }

  async updateAccessGuest(token, accessPersonId, { startsAt, endsAt } = {}) {
    const accessToken = requireText(token, "token");
    requireWindow(startsAt, endsAt);
    const body = await this.send("updateAccessGuest", "PUT", this.guestPath(accessPersonId), accessToken, {
      attributes: { starts_at: startsAt, ends_at: endsAt },
    });
    return this.mapOrFail("updateAccessGuest", mapAccessGuest(body?.data));
  }

  async deactivateAccessGuest(token, accessPersonId) {
    const accessToken = requireText(token, "token");
    const body = await this.send(
      "deactivateAccessGuest",
      "PUT",
      `${this.guestPath(accessPersonId)}/deactivate`,
      accessToken
    );
    const guest = this.mapOrFail("deactivateAccessGuest", mapAccessGuest(body?.data));
    return { providerCredentialId: guest.providerCredentialId, status: guest.status };
  }

  guestPath(accessPersonId) {
    return `/access_persons/${encodeURIComponent(requireText(accessPersonId, "accessPersonId"))}`;
  }

  mapOrFail(operation, mapped) {
    if (mapped === null) {
      throw new RemoteLockApiError({ operation, code: CODE.INVALID_RESPONSE, retryable: false });
    }
    return mapped;
  }

  async send(operation, method, path, token, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    let rawText;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: ACCEPT,
          ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      rawText = await response.text();
    } catch {
      // The original error is dropped on purpose; see RemoteLockApiError.
      const timedOut = controller.signal.aborted;
      throw new RemoteLockApiError({
        operation,
        code: timedOut ? CODE.TIMEOUT : CODE.NETWORK,
        retryable: true,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) throw this.errorForStatus(operation, response);

    try {
      return JSON.parse(rawText);
    } catch {
      throw new RemoteLockApiError({
        operation,
        code: CODE.INVALID_RESPONSE,
        status: response.status,
        retryable: false,
      });
    }
  }

  // The body of an error response is never read. RemoteLock sends X-RateLimit-Reset (UTC epoch seconds) on a 429.
  errorForStatus(operation, response) {
    const { status } = response;
    if (status === 401 || status === 403) {
      return new RemoteLockApiError({ operation, code: CODE.AUTH, status, retryable: false });
    }
    if (status === 429) {
      const resetSeconds = Number.parseFloat(response.headers?.get?.("x-ratelimit-reset"));
      const retryAfterMs = Number.isFinite(resetSeconds) ? Math.max(0, resetSeconds * 1000 - this.now()) : null;
      return new RemoteLockApiError({ operation, code: CODE.RATE_LIMIT, status, retryable: true, retryAfterMs });
    }
    return new RemoteLockApiError({ operation, code: CODE.HTTP, status, retryable: status >= 500 });
  }
}
