import { randomUUID } from "node:crypto";
import { parseOtaResponse, wrapSoapEnvelope } from "../util/otaXml.js";

export const SITEMINDER_PREPROD_URL = "https://tpi-pmsx.preprod.siteminderlabs.com";

export const DEFAULT_TIMEOUT_MS = 10000;

const MAX_MESSAGE_LENGTH = 200;

export class SiteMinderSoapError extends Error {
  constructor(status, errors, { echoToken = null } = {}) {
    const first = errors[0]?.message ?? `SiteMinder request failed with status ${status}`;
    super(String(first).slice(0, MAX_MESSAGE_LENGTH));
    this.name = "SiteMinderSoapError";
    this.status = status;
    this.errors = errors.map((error) => ({ ...error, message: String(error.message ?? "").slice(0, MAX_MESSAGE_LENGTH) }));
    this.echoToken = echoToken;
    // A timeout, a network error or a 5xx can work on a later try. An OTA error answer means the message itself was refused.
    this.retryable = status === null || status >= 500;
  }
}

const required = (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value;
};

// SOAP 1.1 part of pmsXchange: one endpoint per PMS (RequestorID = pmsCode), WS-Security UsernameToken in the header.
export class SiteMinderSoapClient {
  constructor({ pmsCode, username, password, baseUrl = SITEMINDER_PREPROD_URL, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    this.pmsCode = required(pmsCode, "SiteMinder pmsCode");
    this.username = required(username, "SiteMinder username");
    this.password = required(password, "SiteMinder password");
    this.url = `${baseUrl}/webservices/${encodeURIComponent(pmsCode)}`;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  // body is one OTA request element; echoToken is the one inside it, kept for support and logs.
  async send(body, { echoToken = null } = {}) {
    const envelope = wrapSoapEnvelope({ username: this.username, password: this.password, body });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    let text;
    try {
      response = await this.fetchImpl(this.url, {
        method: "POST",
        headers: { "Content-Type": "text/xml; charset=utf-8" },
        body: envelope,
        signal: controller.signal,
      });
      text = await response.text();
    } catch (error) {
      if (controller.signal.aborted) {
        throw new SiteMinderSoapError(null, [{ type: null, code: null, message: `SiteMinder did not answer within ${this.timeoutMs} ms` }], { echoToken });
      }
      throw new SiteMinderSoapError(null, [{ type: null, code: null, message: error.message }], { echoToken });
    } finally {
      clearTimeout(timer);
    }

    const result = parseOtaResponse(text);
    if (result.success && response.ok) {
      return { success: true, echoToken };
    }
    throw new SiteMinderSoapError(response.status, result.errors, { echoToken });
  }
}

export const newEchoToken = () => randomUUID();
