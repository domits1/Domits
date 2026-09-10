import { connectChannex } from "./channexApi";

const CONNECT_URL = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/integrations/channex/connect";

const mockResponse = ({ ok = true, status = 200, body = {} } = {}) => ({
  ok,
  status,
  text: async () => JSON.stringify(body),
});

describe("connectChannex", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  test("posts the api key as a credentials object and returns the parsed body", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse({ body: { connected: true, validationState: "CONNECTED" } }));

    const result = await connectChannex({ userId: "user-1", apiKey: "key-1", displayName: "Staging" });

    expect(globalThis.fetch).toHaveBeenCalledWith(CONNECT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "user-1",
        credentials: { apiKey: "key-1" },
        displayName: "Staging",
      }),
    });
    expect(result).toEqual({ connected: true, validationState: "CONNECTED" });
  });

  test("omits displayName when it is not provided, so the backend default applies", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse({ body: { connected: true } }));

    await connectChannex({ userId: "user-1", apiKey: "key-1" });

    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({
      userId: "user-1",
      credentials: { apiKey: "key-1" },
    });
  });

  test("throws with the backend error message when the request fails", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockResponse({ ok: false, status: 400, body: { error: "Channex credentials must include apiKey." } })
    );

    await expect(connectChannex({ userId: "user-1", apiKey: "" })).rejects.toMatchObject({
      status: 400,
      endpoint: "/integrations/channex/connect",
      method: "POST",
      message: expect.stringContaining("Channex credentials must include apiKey."),
    });
  });

  test("wraps a network failure instead of leaking the raw fetch error", async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error("Failed to fetch"));

    await expect(connectChannex({ userId: "user-1", apiKey: "key-1" })).rejects.toMatchObject({
      endpoint: "/integrations/channex/connect",
      method: "POST",
      message: "POST /integrations/channex/connect failed: Failed to fetch",
    });
  });
});
