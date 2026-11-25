import { jest } from "@jest/globals";
import { TruviApiClient, TruviApiError, TRUVI_SANDBOX_URL } from "../../functions/Truvi-Integration/data/truviApiClient.js";

function fakeFetch(status, body) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  });
}

describe("TruviApiClient.getVerification", () => {
  test("sends a GET to /v1/verificationRequests/{id} with only the key header and no body", async () => {
    const fetchImpl = fakeFetch(200, { verification: { verificationId: "v-1", status: "Approved" } });
    const client = new TruviApiClient({ subscriptionKey: "test-key", fetchImpl });

    const result = await client.getVerification("v-1");

    expect(fetchImpl).toHaveBeenCalledWith(`${TRUVI_SANDBOX_URL}/v1/verificationRequests/v-1`, {
      method: "GET",
      headers: { "Ocp-Apim-Subscription-Key": "test-key" },
      signal: expect.any(AbortSignal),
    });
    expect(result.verification.status).toBe("Approved");
  });

  test("refuses an empty verificationId", () => {
    const client = new TruviApiClient({ subscriptionKey: "test-key", fetchImpl: fakeFetch(200, {}) });

    expect(() => client.getVerification("")).toThrow("verificationId is required");
  });
});

describe("TruviApiError verificationId", () => {
  test("carries the verificationId of a reused echo token", async () => {
    const fetchImpl = fakeFetch(400, {
      detail: "echoToken (abc) already exists from a previous request",
      status: 400,
      verificationId: "v-1",
    });
    const client = new TruviApiClient({ subscriptionKey: "test-key", fetchImpl });

    const error = await client.createVerification({ metadata: {} }).catch((e) => e);

    expect(error).toBeInstanceOf(TruviApiError);
    expect(error.status).toBe(400);
    expect(error.verificationId).toBe("v-1");
  });

  test("is null on any other error", async () => {
    const client = new TruviApiClient({ subscriptionKey: "test-key", fetchImpl: fakeFetch(400, { detail: "Bad" }) });

    const error = await client.createVerification({ metadata: {} }).catch((e) => e);

    expect(error.verificationId).toBeNull();
  });
});
