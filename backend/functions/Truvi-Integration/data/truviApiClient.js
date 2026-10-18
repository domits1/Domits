export const TRUVI_SANDBOX_URL = "https://developer.api.truvi.com/screen-and-protect-sandbox";

export class TruviApiError extends Error {
  constructor(status, body) {
    super(body?.detail || body?.title || `Truvi request failed with status ${status}`);
    this.name = "TruviApiError";
    this.status = status;
    this.body = body;
  }
}

export class TruviApiClient {
  constructor({ subscriptionKey, baseUrl = TRUVI_SANDBOX_URL, fetchImpl = fetch } = {}) {
    if (!subscriptionKey) {
      throw new Error("Truvi subscription key is missing");
    }
    this.subscriptionKey = subscriptionKey;
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
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
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": this.subscriptionKey,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { detail: text };
    }

    if (!response.ok) {
      throw new TruviApiError(response.status, data);
    }
    return data;
  }
}
