import { randomUUID } from "node:crypto";

export const SITEMINDER_PREPROD_URL = "https://tpi-pmsx.preprod.siteminderlabs.com";

export const DEFAULT_TIMEOUT_MS = 10000;

const MAX_MESSAGE_LENGTH = 200;

export class SiteMinderApiError extends Error {
  constructor(status, message, { code = null, traceToken = null } = {}) {
    super(message);
    this.name = "SiteMinderApiError";
    this.status = status;
    this.code = code;
    this.traceToken = traceToken;
  }
}

function firstError(data) {
  const error = Array.isArray(data?.errors) ? data.errors[0] : data;
  return { code: error?.code ?? null, message: error?.message ?? null };
}

const required = (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value;
};

// REST part of pmsXchange (JSON over HTTPS, Basic auth with the PMS-level credentials).
export class SiteMinderRestClient {
  constructor({ pmsCode, username, password, baseUrl = SITEMINDER_PREPROD_URL, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    this.pmsCode = required(pmsCode, "SiteMinder pmsCode");
    required(username, "SiteMinder username");
    required(password, "SiteMinder password");
    this.authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  getRoomRates(hotelCode) {
    required(hotelCode, "hotelCode");
    const path = `/core-api/pmses/${encodeURIComponent(this.pmsCode)}/hotels/${encodeURIComponent(hotelCode)}/room-rates`;
    return this.get(path);
  }

  async get(path, traceToken = randomUUID()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    let text;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: "GET",
        headers: { Authorization: this.authorization, Accept: "application/json", "X-SM-TRACE-TOKEN": traceToken },
        signal: controller.signal,
      });
      text = await response.text();
    } catch (error) {
      if (controller.signal.aborted) {
        throw new SiteMinderApiError(null, `SiteMinder did not answer within ${this.timeoutMs} ms`, { traceToken });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      const { code, message } = firstError(data);
      const shortMessage = String(message || `SiteMinder request failed with status ${response.status}`).slice(0, MAX_MESSAGE_LENGTH);
      throw new SiteMinderApiError(response.status, shortMessage, { code, traceToken });
    }
    return data;
  }
}
