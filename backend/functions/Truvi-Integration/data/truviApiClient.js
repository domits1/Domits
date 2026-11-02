export const TRUVI_SANDBOX_URL = "https://developer.api.truvi.com/screen-and-protect-sandbox";

export const DEFAULT_TIMEOUT_MS = 10000;

const MAX_MESSAGE_LENGTH = 200;

function shortMessage(data, status) {
  const message = data?.detail || data?.title || `Truvi request failed with status ${status}`;
  return String(message).slice(0, MAX_MESSAGE_LENGTH);
}

export class TruviApiError extends Error {
  constructor(status, message, { verificationId = null } = {}) {
    super(message);
    this.name = "TruviApiError";
    this.status = status;
    this.verificationId = verificationId;
  }
}

export class TruviApiClient {
  constructor({ subscriptionKey, baseUrl = TRUVI_SANDBOX_URL, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    if (!subscriptionKey) {
      throw new Error("Truvi subscription key is missing");
    }
    this.subscriptionKey = subscriptionKey;
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  createVerification(request) {
    return this.send("POST", "/verificationRequests", request);
  }

  modifyVerification(request) {
    return this.send("PUT", "/verificationRequests", request);
  }

  cancelVerification(request) {
    return this.send("PUT", "/verificationRequests/cancel", request);
  }

  getVerification(verificationId) {
    if (!verificationId) {
      throw new Error("verificationId is required to retrieve a Truvi verification");
    }
    return this.send("GET", `/v1/verificationRequests/${encodeURIComponent(verificationId)}`);
  }

  async send(method, path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    let text;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, this.#options(method, body, controller.signal));
      text = await response.text();
    } catch (error) {
      if (controller.signal.aborted) {
        throw new TruviApiError(null, `Truvi did not answer within ${this.timeoutMs} ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { detail: text };
    }

    if (!response.ok) {
      const verificationId = typeof data?.verificationId === "string" ? data.verificationId : null;
      throw new TruviApiError(response.status, shortMessage(data, response.status), { verificationId });
    }
    return data;
  }

  #options(method, body, signal) {
    const key = { "Ocp-Apim-Subscription-Key": this.subscriptionKey };
    if (body === undefined) {
      return { method, headers: key, signal };
    }
    return {
      method,
      headers: { "Content-Type": "application/json", ...key },
      body: JSON.stringify(body),
      signal,
    };
  }
}
