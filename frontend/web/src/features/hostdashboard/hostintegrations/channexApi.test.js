import { connectChannex, getChannexStatus } from "./channexApi";
import { getIdToken } from "../../../services/getAccessToken";

jest.mock("../../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
  getIdToken: jest.fn(),
}));

const CONNECT_URL = "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/integrations/channex/connect";
const STATUS_URL =
  "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/integrations/channex/status?userId=user-1";

const mockResponse = ({ ok = true, status = 200, body = {} } = {}) => ({
  ok,
  status,
  text: async () => JSON.stringify(body),
});

describe("connectChannex", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    getIdToken.mockReset().mockResolvedValue("id-token-1");
  });

  test("posts the api key as a credentials object with the ID token and returns the parsed body", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse({ body: { connected: true, validationState: "CONNECTED" } }));

    const result = await connectChannex({ userId: "user-1", apiKey: "key-1", displayName: "Staging" });

    expect(globalThis.fetch).toHaveBeenCalledWith(CONNECT_URL, {
      method: "POST",
      headers: { Authorization: "Bearer id-token-1", "Content-Type": "application/json" },
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

  test("does not send the request when no ID token can be read", async () => {
    getIdToken.mockRejectedValueOnce(new Error("No current user"));

    await expect(connectChannex({ userId: "user-1", apiKey: "key-1" })).rejects.toMatchObject({
      endpoint: "/integrations/channex/connect",
      method: "POST",
      message: "POST /integrations/channex/connect failed: No current user",
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("Channex GET requests", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
    getIdToken.mockReset().mockResolvedValue("id-token-1");
  });

  test("send the ID token without a content type", async () => {
    globalThis.fetch.mockResolvedValueOnce(mockResponse({ body: { status: "CONNECTED" } }));

    await getChannexStatus({ userId: "user-1" });

    expect(globalThis.fetch).toHaveBeenCalledWith(STATUS_URL, {
      method: "GET",
      headers: { Authorization: "Bearer id-token-1" },
    });
  });
});
