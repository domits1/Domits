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
const mockChannexAdapter = { sendMessage: jest.fn() };

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

const MessageService = require("./messageService.js").default;

const RAW_URL = "https://general-messaging-production-attachments.s3.amazonaws.com/images/abc-123.png";
const SIGNED_URL = `${RAW_URL}?X-Amz-Signature=test`;

const signedCopy = (message) =>
  Array.isArray(message?.attachments)
    ? { ...message, attachments: message.attachments.map((item) => ({ ...item, url: `${item.url}?X-Amz-Signature=test` })) }
    : message;

const attachmentSigner = {
  signMessage: jest.fn(async (message) => signedCopy(message)),
  signMessages: jest.fn(async (messages) => messages.map(signedCopy)),
};

const buildService = () => new MessageService({ providerAdapters: { CHANNEX: mockChannexAdapter }, attachmentSigner });

describe("MessageService signs attachment URLs on the way out", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockThreadRepository.updateThreadActivity.mockResolvedValue(undefined);
  });

  test("returns signed attachment URLs for the messages of a thread", async () => {
    mockThreadRepository.getThreadById.mockResolvedValue(buildThread());
    mockMessageRepository.getMessagesByThreadId.mockResolvedValue([
      { id: "message-1", attachments: [{ url: RAW_URL, type: "image" }] },
      { id: "message-2", attachments: null },
    ]);

    const result = await buildService().getMessages("thread-1", hostAuth);

    expect(result.response).toEqual([
      { id: "message-1", attachments: [{ url: SIGNED_URL, type: "image" }] },
      { id: "message-2", attachments: null },
    ]);
  });

  test("stores the raw attachment URL on send and returns the signed one", async () => {
    mockThreadRepository.getThreadById.mockResolvedValue(buildThread());
    mockMessageRepository.createMessage.mockImplementation(async (data) => ({ id: "message-1", ...data }));

    const result = await buildService().sendMessage(
      { threadId: "thread-1", content: "photo", attachments: [{ url: RAW_URL, type: "image" }] },
      hostAuth
    );

    expect(mockMessageRepository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: [{ url: RAW_URL, type: "image" }] })
    );
    expect(result.statusCode).toBe(201);
    expect(result.response).toEqual(
      expect.objectContaining({ id: "message-1", attachments: [{ url: SIGNED_URL, type: "image" }] })
    );
  });

  test("sends the raw attachment URL to the provider on retry and returns the signed one", async () => {
    mockThreadRepository.getThreadById.mockResolvedValue(
      buildThread({ platform: "CHANNEX", integrationAccountId: "integration-1", externalThreadId: "ext-thread-1" })
    );
    mockMessageRepository.getMessageById.mockResolvedValue({
      id: "message-1",
      threadId: "thread-1",
      senderId: "host-1",
      recipientId: "guest-1",
      content: "photo",
      attachments: [{ url: RAW_URL, type: "image" }],
      deliveryStatus: "failed",
      metadata: null,
    });
    mockMessageRepository.claimFailedMessageForRetry.mockResolvedValue(1);
    mockMessageRepository.updateDeliveryResult.mockImplementation(async (id, patch) => ({
      id,
      attachments: [{ url: RAW_URL, type: "image" }],
      ...patch,
    }));
    mockChannexAdapter.sendMessage.mockResolvedValue({ providerMessageId: "provider-1" });

    const result = await buildService().retryMessage("message-1", hostAuth);

    expect(mockChannexAdapter.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: [{ url: RAW_URL, type: "image" }] })
    );
    expect(result.response.attachments).toEqual([{ url: SIGNED_URL, type: "image" }]);
  });

  describe("retry of a message whose attachments are stored as text", () => {
    const storedForms = [
      ["a JSON string", JSON.stringify([{ url: RAW_URL, type: "image" }])],
      ["a Postgres array literal", `{${JSON.stringify(JSON.stringify({ url: RAW_URL, type: "image" }))}}`],
    ];

    test.each(storedForms)("gives the provider an array of attachments when the row holds %s", async (_label, stored) => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        buildThread({ platform: "CHANNEX", integrationAccountId: "integration-1", externalThreadId: "ext-thread-1" })
      );
      mockMessageRepository.getMessageById.mockResolvedValue({
        id: "message-1",
        threadId: "thread-1",
        senderId: "host-1",
        recipientId: "guest-1",
        content: "photo",
        attachments: stored,
        deliveryStatus: "failed",
        metadata: null,
      });
      mockMessageRepository.claimFailedMessageForRetry.mockResolvedValue(1);
      mockMessageRepository.updateDeliveryResult.mockImplementation(async (id, patch) => ({ id, ...patch }));
      mockChannexAdapter.sendMessage.mockResolvedValue({ providerMessageId: "provider-1" });

      await buildService().retryMessage("message-1", hostAuth);

      expect(mockChannexAdapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ attachments: [{ url: RAW_URL, type: "image" }] })
      );
    });

    test("gives the provider no attachments when the row has none", async () => {
      mockThreadRepository.getThreadById.mockResolvedValue(
        buildThread({ platform: "CHANNEX", integrationAccountId: "integration-1", externalThreadId: "ext-thread-1" })
      );
      mockMessageRepository.getMessageById.mockResolvedValue({
        id: "message-1",
        threadId: "thread-1",
        senderId: "host-1",
        recipientId: "guest-1",
        content: "hello",
        attachments: null,
        deliveryStatus: "failed",
        metadata: null,
      });
      mockMessageRepository.claimFailedMessageForRetry.mockResolvedValue(1);
      mockMessageRepository.updateDeliveryResult.mockImplementation(async (id, patch) => ({ id, ...patch }));
      mockChannexAdapter.sendMessage.mockResolvedValue({ providerMessageId: "provider-1" });

      await buildService().retryMessage("message-1", hostAuth);

      expect(mockChannexAdapter.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ attachments: null }));
    });
  });
});
