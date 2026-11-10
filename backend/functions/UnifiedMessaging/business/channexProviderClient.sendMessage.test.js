const { ChannexProviderClient, CREDENTIALS, jsonResponse, useMockedFetch } = require("./channexProviderClientTestUtils.js");

describe("ChannexProviderClient.sendMessage", () => {
  useMockedFetch();
  let client;

  beforeEach(() => {
    client = new ChannexProviderClient();
  });

  test("returns INVALID_CREDENTIALS without calling fetch when apiKey is missing", async () => {
    const result = await client.sendMessage({}, { externalThreadId: "thread-1", text: "hi" });

    expect(result).toMatchObject({
      success: false,
      providerStatus: "INVALID_CREDENTIALS",
      errorCode: "MISSING_API_KEY",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("posts to message_threads/{externalThreadId}/messages with the api key header and message body", async () => {
    global.fetch.mockResolvedValue(jsonResponse(201, { data: { id: "msg-1" } }));

    await client.sendMessage(CREDENTIALS, { externalThreadId: "thread-1", text: "Hello guest" });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url.toString()).toBe("https://staging.channex.io/api/v1/message_threads/thread-1/messages");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "user-api-key": "test-api-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body)).toEqual({ message: { message: "Hello guest" } });
  });

  test("url-encodes an externalThreadId containing / and ? so it stays one path segment", async () => {
    global.fetch.mockResolvedValue(jsonResponse(201, { data: { id: "msg-1" } }));

    await client.sendMessage(CREDENTIALS, { externalThreadId: "thread/1?x", text: "hi" });

    const [url] = global.fetch.mock.calls[0];
    expect(url.pathname).toBe(`/api/v1/message_threads/${encodeURIComponent("thread/1?x")}/messages`);
    expect(url.pathname.endsWith("/messages")).toBe(true);
  });

  test("returns success true with providerMessageId read from data.id", async () => {
    global.fetch.mockResolvedValue(jsonResponse(201, { data: { id: "msg-1" } }));

    const result = await client.sendMessage(CREDENTIALS, { externalThreadId: "thread-1", text: "hi" });

    expect(result).toMatchObject({ success: true, providerMessageId: "msg-1" });
  });

  describe("non-2xx responses map to a distinct errorCode without throwing", () => {
    it.each([
      { status: 401, errorCode: "UNAUTHORIZED" },
      { status: 403, errorCode: "MESSAGING_NOT_INSTALLED" },
      { status: 404, errorCode: "THREAD_NOT_FOUND" },
      { status: 422, errorCode: "OTA_MESSAGING_UNSUPPORTED" },
    ])("status $status maps to errorCode $errorCode", async ({ status, errorCode }) => {
      global.fetch.mockResolvedValue(jsonResponse(status, {}));

      const result = await client.sendMessage(CREDENTIALS, { externalThreadId: "thread-1", text: "hi" });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(errorCode);
    });
  });
});
