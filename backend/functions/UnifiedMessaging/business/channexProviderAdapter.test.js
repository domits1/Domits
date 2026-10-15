const ChannexProviderAdapter = require("./channexProviderAdapter.js").default;
const { CHANNEX_ARI_OUTBOX_DEFAULTS } = require("../.shared/channelManagement/utils/channexAriOutboxConstants.js");

const INTEGRATION = { id: "integration-1", userId: "host-1", credentialsRef: "secret-ref-1" };
const CREDENTIALS = { apiKey: "test-api-key" };

const buildAdapter = ({ integration, credentials, providerClient } = {}) => {
  const integrationAccounts = { getById: jest.fn().mockResolvedValue(integration ?? null) };
  const credentialStore = { readSecretOrNull: jest.fn().mockResolvedValue(credentials ?? null) };
  const client = providerClient || { sendMessage: jest.fn() };
  const adapter = new ChannexProviderAdapter({ integrationAccounts, credentialStore, providerClient: client });
  return { adapter, integrationAccounts, credentialStore, providerClient: client };
};

describe("ChannexProviderAdapter.sendMessage", () => {
  test("throws an Error with a .code when the integration account cannot be found", async () => {
    const { adapter } = buildAdapter({ integration: null });

    await expect(
      adapter.sendMessage({ integrationAccountId: "integration-1", externalThreadId: "thread-1", content: "hi" })
    ).rejects.toThrow(expect.objectContaining({ code: expect.any(String) }));
  });

  test("throws an Error with a .code when Channex credentials are missing", async () => {
    const { adapter } = buildAdapter({ integration: INTEGRATION, credentials: null });

    await expect(
      adapter.sendMessage({ integrationAccountId: "integration-1", externalThreadId: "thread-1", content: "hi" })
    ).rejects.toThrow(expect.objectContaining({ code: expect.any(String) }));
  });

  test("throws an Error with a .code when externalThreadId is missing", async () => {
    const { adapter } = buildAdapter({ integration: INTEGRATION, credentials: CREDENTIALS });

    await expect(
      adapter.sendMessage({ integrationAccountId: "integration-1", content: "hi" })
    ).rejects.toThrow(expect.objectContaining({ code: expect.any(String) }));
  });

  test("calls the provider client with the api key and externalThreadId/text, returning an accepted CHANNEX result", async () => {
    const providerClient = {
      sendMessage: jest.fn().mockResolvedValue({ success: true, providerMessageId: "msg-1" }),
    };
    const { adapter } = buildAdapter({ integration: INTEGRATION, credentials: CREDENTIALS, providerClient });

    const result = await adapter.sendMessage({
      integrationAccountId: "integration-1",
      externalThreadId: "thread-1",
      content: "Hello guest",
    });

    expect(providerClient.sendMessage).toHaveBeenCalledWith(
      { apiKey: "test-api-key" },
      { externalThreadId: "thread-1", text: "Hello guest" },
      { requestTimeoutMs: CHANNEX_ARI_OUTBOX_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS }
    );
    expect(result).toEqual(
      expect.objectContaining({ accepted: true, channel: "CHANNEX", providerMessageId: "msg-1" })
    );
  });

  test.each([
    [
      "throws an Error carrying the client's errorCode on a client-reported failure",
      "THREAD_NOT_FOUND",
      "Thread not found.",
    ],
    [
      "throws with the provider client's CHANNEX_MESSAGE_SEND_TIMEOUT code on a client timeout, so the message is saved as failed",
      "CHANNEX_MESSAGE_SEND_TIMEOUT",
      "Channex message send timed out after 8000 ms.",
    ],
  ])("%s", async (_description, errorCode, errorMessage) => {
    const providerClient = {
      sendMessage: jest.fn().mockResolvedValue({ success: false, errorCode, errorMessage }),
    };
    const { adapter } = buildAdapter({ integration: INTEGRATION, credentials: CREDENTIALS, providerClient });

    await expect(
      adapter.sendMessage({ integrationAccountId: "integration-1", externalThreadId: "thread-1", content: "hi" })
    ).rejects.toThrow(expect.objectContaining({ code: errorCode, message: errorMessage }));
  });

  test("passes requestTimeoutMs to the provider client", async () => {
    const providerClient = {
      sendMessage: jest.fn().mockResolvedValue({ success: true, providerMessageId: "msg-1" }),
    };
    const { adapter } = buildAdapter({ integration: INTEGRATION, credentials: CREDENTIALS, providerClient });

    await adapter.sendMessage({
      integrationAccountId: "integration-1",
      externalThreadId: "thread-1",
      content: "Hello guest",
    });

    expect(providerClient.sendMessage).toHaveBeenCalledWith(
      { apiKey: "test-api-key" },
      { externalThreadId: "thread-1", text: "Hello guest" },
      { requestTimeoutMs: CHANNEX_ARI_OUTBOX_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS }
    );
  });

  test("rejects with CHANNEX_ATTACHMENTS_UNSUPPORTED when attachments are present, without calling the provider client", async () => {
    const providerClient = { sendMessage: jest.fn() };
    const { adapter } = buildAdapter({ integration: INTEGRATION, credentials: CREDENTIALS, providerClient });

    await expect(
      adapter.sendMessage({
        integrationAccountId: "integration-1",
        externalThreadId: "thread-1",
        content: "hi",
        attachments: [{ url: "https://example.com/a.png", type: "image" }],
      })
    ).rejects.toThrow(expect.objectContaining({ code: "CHANNEX_ATTACHMENTS_UNSUPPORTED" }));
    expect(providerClient.sendMessage).not.toHaveBeenCalled();
  });

  test("an empty attachments array still sends normally, with no attachments", async () => {
    const providerClient = {
      sendMessage: jest.fn().mockResolvedValue({ success: true, providerMessageId: "msg-1" }),
    };
    const { adapter } = buildAdapter({ integration: INTEGRATION, credentials: CREDENTIALS, providerClient });

    await adapter.sendMessage({
      integrationAccountId: "integration-1",
      externalThreadId: "thread-1",
      content: "hi",
      attachments: [],
    });

    expect(providerClient.sendMessage).toHaveBeenCalledWith(
      { apiKey: "test-api-key" },
      { externalThreadId: "thread-1", text: "hi" },
      { requestTimeoutMs: CHANNEX_ARI_OUTBOX_DEFAULTS.PROVIDER_REQUEST_TIMEOUT_MS }
    );
  });
});
