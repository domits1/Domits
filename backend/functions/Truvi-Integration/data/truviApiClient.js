export const TRUVI_SANDBOX_URL = "https://developer.api.truvi.com/screen-and-protect-sandbox";

export const DEFAULT_TIMEOUT_MS = 10000;

const MAX_MESSAGE_LENGTH = 200;

function shortMessage(data, status) {
  const message = data?.detail || data?.title || `Truvi request failed with status ${status}`;
  return String(message).slice(0, MAX_MESSAGE_LENGTH);
}

export class TruviApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "TruviApiError";
    this.status = status;
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

  async send(method, path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    let text;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": this.subscriptionKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
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
      throw new TruviApiError(response.status, shortMessage(data, response.status));
    }
    return data;
  }
}
