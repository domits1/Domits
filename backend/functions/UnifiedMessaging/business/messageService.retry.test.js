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

const channexThread = (patch = {}) =>
  buildThread({
    platform: "CHANNEX",
    integrationAccountId: "integration-1",
    externalThreadId: "ext-thread-1",
    ...patch,
  });

const failedMessage = (patch = {}) => ({
  id: "message-1",
  threadId: "thread-1",
  senderId: "host-1",
  recipientId: "guest-1",
  content: "hello guest",
  attachments: null,
  platformMessageId: null,
  deliveryStatus: "failed",
  errorCode: "THREAD_NOT_FOUND",
  errorMessage: "This conversation could not be found on the channel.",
  metadata: null,
  ...patch,
});

const buildService = () => new MessageService({ providerAdapters: { CHANNEX: mockChannexAdapter } });

describe("MessageService.retryMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockThreadRepository.getThreadById.mockResolvedValue(channexThread());
    mockMessageRepository.getMessageById.mockResolvedValue(failedMessage());
    mockMessageRepository.claimFailedMessageForRetry.mockResolvedValue(1);
    mockMessageRepository.updateDeliveryResult.mockImplementation(async (id, patch) => ({
      ...failedMessage(),
      id,
      ...patch,
    }));
  });

  test("resends through the provider adapter and stores the sent result on the same row", async () => {
    mockChannexAdapter.sendMessage.mockResolvedValue({ providerMessageId: "channex-msg-1" });

    const result = await buildService().retryMessage("message-1", hostAuth);

    expect(mockChannexAdapter.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationAccountId: "integration-1",
        externalThreadId: "ext-thread-1",
        recipientId: "guest-1",
        content: "hello guest",
      })
    );
    expect(mockMessageRepository.updateDeliveryResult).toHaveBeenCalledWith(
      "message-1",
      expect.objectContaining({
        deliveryStatus: "sent",
        platformMessageId: "channex-msg-1",
        errorCode: null,
        errorMessage: null,
      })
    );
    expect(result.statusCode).toBe(200);
    expect(result.response).toEqual(
      expect.objectContaining({ id: "message-1", deliveryStatus: "sent", platformMessageId: "channex-msg-1" })
    );
  });

  test("claims the failed row before sending so a second retry cannot send again", async () => {
    mockChannexAdapter.sendMessage.mockResolvedValue({ providerMessageId: "channex-msg-1" });

    await buildService().retryMessage("message-1", hostAuth);

    const claimOrder = mockMessageRepository.claimFailedMessageForRetry.mock.invocationCallOrder[0];
    const sendOrder = mockChannexAdapter.sendMessage.mock.invocationCallOrder[0];
    expect(claimOrder).toBeLessThan(sendOrder);
  });

  test("stores the new failure and answers 502 when the provider still fails", async () => {
    const providerError = Object.assign(new Error("denied"), { code: "UNAUTHORIZED" });
    mockChannexAdapter.sendMessage.mockRejectedValue(providerError);

    const result = await buildService().retryMessage("message-1", hostAuth);

    expect(mockMessageRepository.updateDeliveryResult).toHaveBeenCalledWith(
      "message-1",
      expect.objectContaining({
        deliveryStatus: "failed",
        errorCode: "UNAUTHORIZED",
        errorMessage: "This channel connection is no longer authorized.",
      })
    );
    expect(result.statusCode).toBe(502);
    expect(result.response).toEqual(expect.objectContaining({ id: "message-1", deliveryStatus: "failed" }));
  });

  test("rejects a caller who is not the sender with 403 and sends nothing", async () => {
    mockMessageRepository.getMessageById.mockResolvedValue(failedMessage({ senderId: "guest-1" }));

    await expect(buildService().retryMessage("message-1", hostAuth)).rejects.toMatchObject({ statusCode: 403 });

    expect(mockMessageRepository.claimFailedMessageForRetry).not.toHaveBeenCalled();
    expect(mockChannexAdapter.sendMessage).not.toHaveBeenCalled();
  });

  test.each(["sent", "delivered", "pending"])("rejects a %s message with 409 and sends nothing", async (status) => {
    mockMessageRepository.getMessageById.mockResolvedValue(failedMessage({ deliveryStatus: status }));

    await expect(buildService().retryMessage("message-1", hostAuth)).rejects.toMatchObject({ statusCode: 409 });

    expect(mockMessageRepository.claimFailedMessageForRetry).not.toHaveBeenCalled();
    expect(mockChannexAdapter.sendMessage).not.toHaveBeenCalled();
  });

  test("answers 409 and sends nothing when another retry already claimed the row", async () => {
    mockMessageRepository.claimFailedMessageForRetry.mockResolvedValue(0);

    await expect(buildService().retryMessage("message-1", hostAuth)).rejects.toMatchObject({ statusCode: 409 });

    expect(mockChannexAdapter.sendMessage).not.toHaveBeenCalled();
    expect(mockMessageRepository.updateDeliveryResult).not.toHaveBeenCalled();
  });

  test("answers 404 when the message does not exist", async () => {
    mockMessageRepository.getMessageById.mockResolvedValue(null);

    await expect(buildService().retryMessage("missing", hostAuth)).rejects.toMatchObject({ statusCode: 404 });

    expect(mockChannexAdapter.sendMessage).not.toHaveBeenCalled();
  });

  test("answers 409 for a Domits-internal thread because it has no provider to resend through", async () => {
    mockThreadRepository.getThreadById.mockResolvedValue(buildThread({ platform: "DOMITS" }));

    await expect(buildService().retryMessage("message-1", hostAuth)).rejects.toMatchObject({ statusCode: 409 });

    expect(mockMessageRepository.claimFailedMessageForRetry).not.toHaveBeenCalled();
  });

  test("answers 403 when the caller is no longer a participant of the thread", async () => {
    mockThreadRepository.getThreadById.mockResolvedValue(channexThread({ hostId: "other-host" }));

    await expect(buildService().retryMessage("message-1", hostAuth)).rejects.toMatchObject({ statusCode: 403 });

    expect(mockMessageRepository.claimFailedMessageForRetry).not.toHaveBeenCalled();
  });

  test("keeps the stored metadata keys at the top level instead of nesting them under rawMetadata", async () => {
    mockMessageRepository.getMessageById.mockResolvedValue(
      failedMessage({ metadata: JSON.stringify({ isAutomated: false, providerResult: { accepted: false } }) })
    );
    mockChannexAdapter.sendMessage.mockResolvedValue({ providerMessageId: "channex-msg-1" });

    await buildService().retryMessage("message-1", hostAuth);

    const storedMetadata = JSON.parse(mockMessageRepository.updateDeliveryResult.mock.calls[0][1].metadata);
    expect(storedMetadata.isAutomated).toBe(false);
    expect(storedMetadata.rawMetadata).toBeUndefined();
  });

  test("never creates a second row", async () => {
    mockChannexAdapter.sendMessage.mockResolvedValue({ providerMessageId: "channex-msg-1" });

    await buildService().retryMessage("message-1", hostAuth);

    expect(mockMessageRepository.createMessage).not.toHaveBeenCalled();
  });
});
