const {
  createMockMessageRepository,
  createMockThreadRepository,
  createMockBookingRepository,
  hostAuth,
  buildThread,
} = require("./messageServiceTestUtils.js");

const mockMessageRepository = createMockMessageRepository();
const mockThreadRepository = createMockThreadRepository();
const mockBookingRepository = createMockBookingRepository();
const mockWhatsAppAdapterInstance = { sendMessage: jest.fn(), describeFailure: jest.fn() };

function mockRepositoryModule(instance) {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => instance),
  };
}

jest.mock("../data/messageRepository.js", () => mockRepositoryModule(mockMessageRepository));

jest.mock("../data/threadRepository.js", () => ({
  __esModule: true,
  isDomitsBookingThreadUniqueError: jest.fn((error) => error?.code === "23505"),
  default: jest.fn().mockImplementation(() => mockThreadRepository),
}));

jest.mock("../data/bookingRepository.js", () => mockRepositoryModule(mockBookingRepository));

jest.mock("./whatsappProviderAdapter.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockWhatsAppAdapterInstance),
}));

const MessageService = require("./messageService.js").default;
const ChannexProviderAdapter = require("./channexProviderAdapter.js").default;

const thread = buildThread;

const registeredTestProviderAdapter = () => ({
  sendMessage: jest.fn().mockResolvedValue({ providerMessageId: "tp-1" }),
});

const withTestProvider = (testProviderAdapter) => ({
  providerAdapters: { WHATSAPP: mockWhatsAppAdapterInstance, TEST_PROVIDER: testProviderAdapter },
});

const sendAndCaptureSavedRow = async (service) => {
  mockMessageRepository.createMessage.mockClear();
  const result = await service.sendMessage({ threadId: "thread-1", content: "hi" }, hostAuth);
  const savedRow = mockMessageRepository.createMessage.mock.calls[0][0];
  return { result, savedRow };
};

const expectRawTextAppearsNowhere = (result, savedRow, rawText) => {
  expect(JSON.stringify(savedRow)).not.toContain(rawText);
  expect(JSON.stringify(result)).not.toContain(rawText);
};

describe("MessageService outbound provider routing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockThreadRepository.updateThreadActivity.mockResolvedValue(undefined);
    mockThreadRepository.findThread.mockResolvedValue(null);
    mockThreadRepository.createThread.mockResolvedValue(thread({ id: "fallback-thread" }));
    mockMessageRepository.createMessage.mockResolvedValue({ id: "message-1", createdAt: 1 });
  });

  // Characterization tests — must already be GREEN today. They pin current behavior
  // so the refactor can be verified not to have changed it.
  describe("characterization: existing behavior must not change", () => {
    test("sends a DOMITS-internal message unchanged: no adapter call, delivered status", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(thread({ platform: "DOMITS" }));

      const service = new MessageService();
      const result = await service.sendMessage({ threadId: "thread-1", content: "hi" }, hostAuth);

      expect(mockWhatsAppAdapterInstance.sendMessage).not.toHaveBeenCalled();
      expect(mockMessageRepository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryStatus: "delivered", externalSenderType: null })
      );
      expect(result.statusCode).toBe(201);
    });

    test("sends a WhatsApp message unchanged: adapter called, sent status, provider result mapped", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        thread({ platform: "WHATSAPP", integrationAccountId: "integration-1", externalThreadId: "wa-1" })
      );
      mockWhatsAppAdapterInstance.sendMessage.mockResolvedValue({ providerMessageId: "wamid.123", accepted: true });

      const service = new MessageService();
      const result = await service.sendMessage({ threadId: "thread-1", content: "hi" }, hostAuth);

      expect(mockWhatsAppAdapterInstance.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ integrationAccountId: "integration-1", recipientId: "guest-1", content: "hi" })
      );
      expect(mockMessageRepository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          platformMessageId: "wamid.123",
          deliveryStatus: "sent",
          externalSenderType: "HOST",
        })
      );
      expect(result.statusCode).toBe(201);
    });

    test("preserves WhatsApp send-failure behavior unchanged: describeFailure drives providerResult, failed status, 502", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        thread({ platform: "WHATSAPP", integrationAccountId: "integration-1", externalThreadId: "wa-1" })
      );
      const sendError = new Error("boom");
      mockWhatsAppAdapterInstance.sendMessage.mockRejectedValue(sendError);
      const describedFailure = {
        accepted: false,
        mode: "live",
        channel: "WHATSAPP",
        integrationAccountId: "integration-1",
        externalAccountId: null,
        recipientWhatsAppId: "guest-1",
        messageType: "text",
        text: "hi",
        error: "boom",
        details: null,
      };
      mockWhatsAppAdapterInstance.describeFailure.mockReturnValue(describedFailure);

      const service = new MessageService();
      const result = await service.sendMessage({ threadId: "thread-1", content: "hi" }, hostAuth);

      expect(mockWhatsAppAdapterInstance.describeFailure).toHaveBeenCalledWith(
        expect.objectContaining({ integrationAccountId: "integration-1", content: "hi" }),
        "guest-1",
        sendError
      );
      expect(mockMessageRepository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryStatus: "failed",
          errorCode: "WHATSAPP_SEND_FAILED",
          errorMessage: "This message could not be delivered.",
        })
      );
      expect(result.response.providerResult).toEqual({
        accepted: false,
        mode: "live",
        channel: "WHATSAPP",
        recipientWhatsAppId: "guest-1",
        messageType: "text",
        error: "This message could not be delivered.",
      });
      expect(result.statusCode).toBe(502);
    });
  });

  // Generic provider routing: proves a second registered provider is handled purely
  // through the adapter registry, with no WhatsApp-specific branching in messageService.
  describe("generic provider routing: registered non-WhatsApp provider", () => {
    test("routes a registered non-WhatsApp platform through its injected adapter", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        thread({ platform: "TEST_PROVIDER", integrationAccountId: "integration-9", externalThreadId: "ext-9" })
      );
      const testProviderAdapter = registeredTestProviderAdapter();

      const service = new MessageService(withTestProvider(testProviderAdapter));
      const result = await service.sendMessage({ threadId: "thread-1", content: "hi" }, hostAuth);

      expect(testProviderAdapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ integrationAccountId: "integration-9", recipientId: "guest-1", content: "hi" })
      );
      expect(mockMessageRepository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({ platformMessageId: "tp-1", deliveryStatus: "sent" })
      );
      expect(result.statusCode).toBe(201);
    });

    test("resolves a new external thread generically for a registered non-WhatsApp platform", async () => {
      mockThreadRepository.upsertExternalThread.mockResolvedValue(
        thread({ id: "new-thread", platform: "TEST_PROVIDER", integrationAccountId: "integration-9", externalThreadId: "ext-9" })
      );
      const testProviderAdapter = registeredTestProviderAdapter();
      const integrationAccounts = {
        getById: jest.fn().mockResolvedValue({ id: "integration-9", userId: "host-1" }),
      };

      const service = new MessageService({ ...withTestProvider(testProviderAdapter), integrationAccounts });
      const result = await service.sendMessage(
        {
          platform: "TEST_PROVIDER",
          integrationAccountId: "integration-9",
          externalThreadId: "ext-9",
          recipientId: "guest-9",
          content: "hi",
        },
        hostAuth
      );

      expect(mockThreadRepository.upsertExternalThread).toHaveBeenCalledWith(
        expect.objectContaining({ platform: "TEST_PROVIDER", integrationAccountId: "integration-9", externalThreadId: "ext-9" })
      );
      expect(mockThreadRepository.createThread).not.toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
    });

    test("forwards attachments unchanged to a registered non-WhatsApp adapter", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        thread({ platform: "TEST_PROVIDER", integrationAccountId: "integration-9", externalThreadId: "ext-9" })
      );
      const attachments = [{ url: "https://example.com/a.png", type: "image" }];
      const testProviderAdapter = registeredTestProviderAdapter();

      const service = new MessageService(withTestProvider(testProviderAdapter));
      await service.sendMessage({ threadId: "thread-1", content: "", attachments }, hostAuth);

      expect(testProviderAdapter.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ attachments }));
      expect(mockMessageRepository.createMessage).toHaveBeenCalledWith(expect.objectContaining({ attachments }));
    });

    test("persists a generic-provider failure using the provider-neutral fallback shape when the adapter has no describeFailure", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        thread({ platform: "TEST_PROVIDER", integrationAccountId: "integration-9", externalThreadId: "ext-9" })
      );
      const sendError = new Error("provider unreachable");
      const testProviderAdapter = { sendMessage: jest.fn().mockRejectedValue(sendError) };

      const service = new MessageService(withTestProvider(testProviderAdapter));
      const result = await service.sendMessage({ threadId: "thread-1", content: "hi" }, hostAuth);

      expect(mockMessageRepository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryStatus: "failed",
          errorCode: "TEST_PROVIDER_SEND_FAILED",
          errorMessage: "This message could not be delivered.",
        })
      );
      // toEqual (not objectContaining) proves the fallback shape has no WhatsApp-only
      // fields such as recipientWhatsAppId leaking in for a provider without describeFailure.
      expect(result.response.providerResult).toEqual({
        accepted: false,
        channel: "TEST_PROVIDER",
        recipientId: "guest-1",
        error: "This message could not be delivered.",
      });
      expect(result.statusCode).toBe(502);
    });
  });

  describe("forwards externalThreadId to the adapter for an existing external thread", () => {
    test("includes externalThreadId when sending on an existing WhatsApp thread, alongside today's args", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        thread({ platform: "WHATSAPP", integrationAccountId: "integration-1", externalThreadId: "wa-1" })
      );
      mockWhatsAppAdapterInstance.sendMessage.mockResolvedValue({ providerMessageId: "wamid.123", accepted: true });

      const service = new MessageService();
      await service.sendMessage({ threadId: "thread-1", content: "hi" }, hostAuth);

      expect(mockWhatsAppAdapterInstance.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationAccountId: "integration-1",
          recipientId: "guest-1",
          content: "hi",
          externalThreadId: "wa-1",
        })
      );
    });

    test("includes externalThreadId when sending on an existing registered non-WhatsApp thread", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        thread({ platform: "TEST_PROVIDER", integrationAccountId: "integration-9", externalThreadId: "ext-9" })
      );
      const testProviderAdapter = registeredTestProviderAdapter();

      const service = new MessageService(withTestProvider(testProviderAdapter));
      await service.sendMessage({ threadId: "thread-1", content: "hi" }, hostAuth);

      expect(testProviderAdapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          integrationAccountId: "integration-9",
          recipientId: "guest-1",
          content: "hi",
          externalThreadId: "ext-9",
        })
      );
    });
  });

  // Unsupported provider must fail explicitly, before any DOMITS-style delivery
  // or thread mutation.
  describe("unregistered provider: fails explicitly and without side effects", () => {
    const unknownProviderPayload = {
      platform: "UNKNOWN_PROVIDER",
      integrationAccountId: "integration-9",
      externalThreadId: "ext-9",
      recipientId: "guest-9",
      content: "hi",
    };

    test("rejects an unregistered platform with a 400 UNSUPPORTED_PROVIDER error", async () => {
      const service = new MessageService();

      await expect(service.sendMessage(unknownProviderPayload, hostAuth)).rejects.toMatchObject({
        statusCode: 400,
        code: "UNSUPPORTED_PROVIDER",
      });
    });

    test("never silently delivers an unregistered platform through the DOMITS-internal path", async () => {
      const service = new MessageService();

      await expect(service.sendMessage(unknownProviderPayload, hostAuth)).rejects.toBeDefined();
      expect(mockMessageRepository.createMessage).not.toHaveBeenCalled();
    });

    test("does not create or upsert any thread for an unregistered platform before rejecting", async () => {
      const service = new MessageService();

      await expect(service.sendMessage(unknownProviderPayload, hostAuth)).rejects.toBeDefined();
      expect(mockThreadRepository.upsertExternalThread).not.toHaveBeenCalled();
      expect(mockThreadRepository.createThread).not.toHaveBeenCalled();
      expect(mockThreadRepository.findThread).not.toHaveBeenCalled();
    });
  });

  describe("CHANNEX attachments are rejected, not silently dropped", () => {
    test("a CHANNEX send with attachments is saved with deliveryStatus failed and errorCode CHANNEX_ATTACHMENTS_UNSUPPORTED", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        thread({ platform: "CHANNEX", integrationAccountId: "integration-1", externalThreadId: "channex-thread-1" })
      );
      const integrationAccounts = {
        getById: jest.fn().mockResolvedValue({ id: "integration-1", userId: "host-1", credentialsRef: "secret-ref-1" }),
      };
      const credentialStore = { readSecretOrNull: jest.fn().mockResolvedValue({ apiKey: "test-api-key" }) };
      const providerClient = {
        sendMessage: jest.fn().mockResolvedValue({ success: true, providerMessageId: "msg-1" }),
      };
      const channexAdapter = new ChannexProviderAdapter({ integrationAccounts, credentialStore, providerClient });
      const attachments = [{ url: "https://example.com/a.png", type: "image" }];

      const service = new MessageService({ providerAdapters: { CHANNEX: channexAdapter } });
      const result = await service.sendMessage({ threadId: "thread-1", content: "", attachments }, hostAuth);

      expect(providerClient.sendMessage).not.toHaveBeenCalled();
      expect(mockMessageRepository.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryStatus: "failed", errorCode: "CHANNEX_ATTACHMENTS_UNSUPPORTED" })
      );
      expect(result.statusCode).toBe(502);
    });
  });

  describe("provider failure errorMessage is generic per code, never the raw provider text", () => {
    test("the same known error code produces the same generic errorMessage for two different raw provider texts", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        thread({ platform: "TEST_PROVIDER", integrationAccountId: "integration-9", externalThreadId: "ext-9" })
      );
      const knownCode = "CHANNEX_RECONNECT_REQUIRED";
      const rawTextA = "raw detail A";
      const rawTextB = "a totally different raw detail B";

      const adapterA = {
        sendMessage: jest.fn().mockRejectedValue(Object.assign(new Error(rawTextA), { code: knownCode })),
      };
      const serviceA = new MessageService(withTestProvider(adapterA));
      const { result: resultA, savedRow: savedRowA } = await sendAndCaptureSavedRow(serviceA);

      const adapterB = {
        sendMessage: jest.fn().mockRejectedValue(Object.assign(new Error(rawTextB), { code: knownCode })),
      };
      const serviceB = new MessageService(withTestProvider(adapterB));
      const { result: resultB, savedRow: savedRowB } = await sendAndCaptureSavedRow(serviceB);

      expect(savedRowA.errorCode).toBe(knownCode);
      expect(savedRowB.errorCode).toBe(knownCode);
      expect(savedRowA.errorMessage).toBe(savedRowB.errorMessage);
      expectRawTextAppearsNowhere(resultA, savedRowA, rawTextA);
      expectRawTextAppearsNowhere(resultB, savedRowB, rawTextB);
    });

    test("an unknown error code falls back to one generic default errorMessage, not the raw provider text", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        thread({ platform: "TEST_PROVIDER", integrationAccountId: "integration-9", externalThreadId: "ext-9" })
      );
      const rawText = "some unmapped raw provider detail";
      const testProviderAdapter = {
        sendMessage: jest.fn().mockRejectedValue(Object.assign(new Error(rawText), { code: "SOME_UNMAPPED_CODE" })),
      };

      const service = new MessageService(withTestProvider(testProviderAdapter));
      const { result, savedRow } = await sendAndCaptureSavedRow(service);

      expect(savedRow.errorCode).toBe("SOME_UNMAPPED_CODE");
      expectRawTextAppearsNowhere(result, savedRow, rawText);
    });

    test("WhatsApp failure: the raw provider error text appears nowhere in the saved row or the returned result", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        thread({ platform: "WHATSAPP", integrationAccountId: "integration-1", externalThreadId: "wa-1" })
      );
      const { default: RealWhatsAppProviderAdapter } = jest.requireActual("./whatsappProviderAdapter.js");
      const realAdapter = new RealWhatsAppProviderAdapter();
      const rawText = "WhatsApp rejected this message for a very specific raw reason";
      realAdapter.sendMessage = jest
        .fn()
        .mockRejectedValue(Object.assign(new Error(rawText), { code: "WHATSAPP_SEND_FAILED" }));

      const service = new MessageService({ providerAdapters: { WHATSAPP: realAdapter } });
      const { result, savedRow } = await sendAndCaptureSavedRow(service);

      expect(savedRow.errorCode).toBe("WHATSAPP_SEND_FAILED");
      expectRawTextAppearsNowhere(result, savedRow, rawText);
    });

    test("WhatsApp failure: raw provider details nested in error.details appear nowhere in the saved row or the returned result", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        thread({ platform: "WHATSAPP", integrationAccountId: "integration-1", externalThreadId: "wa-1" })
      );
      const { default: RealWhatsAppProviderAdapter } = jest.requireActual("./whatsappProviderAdapter.js");
      const realAdapter = new RealWhatsAppProviderAdapter();
      const rawMetaText = "some very specific raw Meta API diagnostic text";
      const sendError = Object.assign(new Error("WhatsApp send failed"), {
        code: "WHATSAPP_SEND_FAILED",
        details: { error: { message: rawMetaText } },
      });
      realAdapter.sendMessage = jest.fn().mockRejectedValue(sendError);

      const service = new MessageService({ providerAdapters: { WHATSAPP: realAdapter } });
      const { result, savedRow } = await sendAndCaptureSavedRow(service);

      expect(savedRow.errorCode).toBe("WHATSAPP_SEND_FAILED");
      expectRawTextAppearsNowhere(result, savedRow, rawMetaText);
    });
  });
});
