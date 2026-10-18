import { jest } from "@jest/globals";
import { TruviApiClient, TruviApiError, TRUVI_SANDBOX_URL } from "../../functions/Truvi-Integration/data/truviApiClient.js";

function fakeFetch(status, body) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  });
}

const request = { metadata: { echoToken: "token-1" } };

describe("TruviApiClient", () => {
  test("refuses to start without a subscription key", () => {
    expect(() => new TruviApiClient({})).toThrow("subscription key is missing");
  });

  test("create sends a POST to verificationRequests with the key header", async () => {
    const fetchImpl = fakeFetch(200, { verification: { verificationId: "v-1", status: "Approved" } });
    const client = new TruviApiClient({ subscriptionKey: "test-key", fetchImpl });

    const result = await client.createVerification(request);

    expect(fetchImpl).toHaveBeenCalledWith(`${TRUVI_SANDBOX_URL}/verificationRequests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Ocp-Apim-Subscription-Key": "test-key" },
      body: JSON.stringify(request),
    });
    expect(result.verification.status).toBe("Approved");
  });

  test("modify sends a PUT to verificationRequests", async () => {
    const fetchImpl = fakeFetch(200, { metadata: { echoToken: "token-1" } });
    const client = new TruviApiClient({ subscriptionKey: "test-key", fetchImpl });

    await client.modifyVerification(request);

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${TRUVI_SANDBOX_URL}/verificationRequests`);
    expect(options.method).toBe("PUT");
  });

  test("cancel sends a PUT to verificationRequests/cancel", async () => {
    const fetchImpl = fakeFetch(200, { metadata: { echoToken: "token-1" } });
    const client = new TruviApiClient({ subscriptionKey: "test-key", fetchImpl });

    await client.cancelVerification(request);

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${TRUVI_SANDBOX_URL}/verificationRequests/cancel`);
    expect(options.method).toBe("PUT");
  });

  test("throws a TruviApiError with the status and detail when Truvi returns an error", async () => {
    const fetchImpl = fakeFetch(400, { title: "Bad Request", status: "400", detail: "Check in date is in the past" });
    const client = new TruviApiClient({ subscriptionKey: "test-key", fetchImpl });

    const error = await client.createVerification(request).catch((e) => e);

    expect(error).toBeInstanceOf(TruviApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe("Check in date is in the past");
  });

  test("still throws a clear error when the error body is not JSON", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 503, text: async () => "Service Unavailable" });
    const client = new TruviApiClient({ subscriptionKey: "test-key", fetchImpl });

    const error = await client.createVerification(request).catch((e) => e);

    expect(error).toBeInstanceOf(TruviApiError);
    expect(error.status).toBe(503);
    expect(error.message).toBe("Service Unavailable");
  });
});
