const mockMessageRepository = {
  createMessage: jest.fn(),
  getMessagesByThreadId: jest.fn(),
};
const mockThreadRepository = {
  createThread: jest.fn(),
  findThread: jest.fn(),
  findThreadByBookingId: jest.fn(),
  getThreadById: jest.fn(),
  getThreadsForUser: jest.fn(),
  updateThreadActivity: jest.fn(),
  upsertExternalThread: jest.fn(),
};
const mockBookingRepository = {
  getBookingById: jest.fn(),
  findBookingsForGuestHostProperty: jest.fn(),
};

jest.mock("../data/messageRepository.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockMessageRepository),
}));

jest.mock("../data/threadRepository.js", () => ({
  __esModule: true,
  isDomitsBookingThreadUniqueError: jest.fn((error) => error?.code === "23505"),
  default: jest.fn().mockImplementation(() => mockThreadRepository),
}));

jest.mock("../data/bookingRepository.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockBookingRepository),
}));

jest.mock("./whatsappProviderAdapter.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    sendMessage: jest.fn(),
  })),
}));

const MessageService = require("./messageService.js").default;

const guestAuth = { userId: "guest-1", isGuest: true, isHost: false };
const hostAuth = { userId: "host-1", isGuest: false, isHost: true };

const thread = (patch = {}) => ({
  id: "thread-1",
  hostId: "host-1",
  guestId: "guest-1",
  propertyId: "property-1",
  platform: "DOMITS",
  ...patch,
});

const booking = (patch = {}) => ({
  id: "booking-1",
  guestid: "guest-1",
  hostid: "host-1",
  property_id: "property-1",
  ...patch,
});

describe("MessageService authorization and booking scoping", () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    mockThreadRepository.updateThreadActivity.mockResolvedValue(undefined);
    service = new MessageService();
  });

  test("allows a guest to read messages only when the booking matches the thread", async () => {
    mockThreadRepository.getThreadById.mockResolvedValue(thread({ bookingId: "booking-1" }));
    mockBookingRepository.getBookingById.mockResolvedValue(booking());
    mockMessageRepository.getMessagesByThreadId.mockResolvedValue([{ id: "message-1" }]);

    const result = await service.getMessages("thread-1", guestAuth);

    expect(result).toEqual({ statusCode: 200, response: [{ id: "message-1" }] });
    expect(mockBookingRepository.getBookingById).toHaveBeenCalledWith("booking-1");
    expect(mockMessageRepository.getMessagesByThreadId).toHaveBeenCalledWith("thread-1");
  });

  test("rejects a guest when the booking does not belong to the authenticated guest", async () => {
    mockThreadRepository.getThreadById.mockResolvedValue(thread({ bookingId: "booking-1" }));
    mockBookingRepository.getBookingById.mockResolvedValue(booking({ guestid: "other-guest" }));

    await expect(service.getMessages("thread-1", guestAuth)).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
    expect(mockMessageRepository.getMessagesByThreadId).not.toHaveBeenCalled();
  });

  test("allows legacy guest threads only when a matching reservation exists", async () => {
    mockThreadRepository.getThreadById.mockResolvedValue(thread({ bookingId: null }));
    mockBookingRepository.findBookingsForGuestHostProperty.mockResolvedValue([booking()]);
    mockMessageRepository.getMessagesByThreadId.mockResolvedValue([]);

    const result = await service.getMessages("thread-1", guestAuth);

    expect(result.response).toEqual([]);
    expect(mockBookingRepository.findBookingsForGuestHostProperty).toHaveBeenCalledWith({
      guestId: "guest-1",
      hostId: "host-1",
      propertyId: "property-1",
    });
  });

  test("rejects legacy guest threads when no matching reservation exists", async () => {
    mockThreadRepository.getThreadById.mockResolvedValue(thread({ bookingId: null }));
    mockBookingRepository.findBookingsForGuestHostProperty.mockResolvedValue([]);

    await expect(service.getMessages("thread-1", guestAuth)).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
    expect(mockMessageRepository.getMessagesByThreadId).not.toHaveBeenCalled();
  });

  test("rejects ambiguous legacy guest threads with multiple matching reservations", async () => {
    mockThreadRepository.getThreadById.mockResolvedValue(thread({ bookingId: null }));
    mockBookingRepository.findBookingsForGuestHostProperty.mockResolvedValue([
      booking({ id: "booking-1" }),
      booking({ id: "booking-2" }),
    ]);

    await expect(service.getMessages("thread-1", guestAuth)).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
    expect(mockMessageRepository.getMessagesByThreadId).not.toHaveBeenCalled();
  });

  test("preserves host access to legacy threads without booking lookups", async () => {
    mockThreadRepository.getThreadsForUser.mockResolvedValue([thread({ bookingId: null, propertyId: null })]);

    const result = await service.getThreads(hostAuth);

    expect(result.response).toEqual([expect.objectContaining({ id: "thread-1", bookingId: null })]);
    expect(mockBookingRepository.getBookingById).not.toHaveBeenCalled();
    expect(mockBookingRepository.findBookingsForGuestHostProperty).not.toHaveBeenCalled();
  });

  test("rejects spoofed sender ids", async () => {
    await expect(
      service.sendMessage({ senderId: "other-user", bookingId: "booking-1", content: "Hello" }, guestAuth)
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
    expect(mockMessageRepository.createMessage).not.toHaveBeenCalled();
  });

  test("rejects mismatched bookingId when sending to an existing thread", async () => {
    mockThreadRepository.getThreadById.mockResolvedValue(thread({ bookingId: "booking-1" }));
    mockBookingRepository.getBookingById.mockResolvedValue(booking());

    await expect(
      service.sendMessage({ threadId: "thread-1", bookingId: "booking-2", content: "Hello" }, guestAuth)
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
    expect(mockMessageRepository.createMessage).not.toHaveBeenCalled();
  });

  test("requires bookingId when a guest starts a new conversation", async () => {
    await expect(service.sendMessage({ recipientId: "host-1", content: "Hello" }, guestAuth)).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
  });

  test("creates guest reservation conversations from booking ownership and stores bookingId", async () => {
    mockBookingRepository.getBookingById.mockResolvedValue(booking());
    mockThreadRepository.findThreadByBookingId.mockResolvedValue(null);
    mockThreadRepository.createThread.mockResolvedValue(thread({ bookingId: "booking-1" }));
    mockMessageRepository.createMessage.mockImplementation(async (row) => ({ id: "message-1", ...row }));

    const result = await service.sendMessage({ bookingId: "booking-1", content: "Hello host" }, guestAuth);

    expect(result.statusCode).toBe(201);
    expect(mockThreadRepository.findThreadByBookingId).toHaveBeenCalledWith("booking-1");
    expect(mockThreadRepository.createThread).toHaveBeenCalledWith(
      expect.objectContaining({
        hostId: "host-1",
        guestId: "guest-1",
        propertyId: "property-1",
        bookingId: "booking-1",
      })
    );
    expect(mockMessageRepository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "thread-1",
        senderId: "guest-1",
        recipientId: "host-1",
        content: "Hello host",
      })
    );
  });

  test("recovers from a concurrent booking-thread insert without duplicating the first message", async () => {
    const duplicateBookingThreadError = Object.assign(new Error("duplicate key"), {
      code: "23505",
      constraint: "idx_unified_thread_domits_booking_unique",
    });

    mockBookingRepository.getBookingById.mockResolvedValue(booking());
    mockThreadRepository.findThreadByBookingId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(thread({ bookingId: "booking-1" }));
    mockThreadRepository.createThread.mockRejectedValue(duplicateBookingThreadError);
    mockMessageRepository.createMessage.mockImplementation(async (row) => ({ id: "message-1", ...row }));

    const result = await service.sendMessage({ bookingId: "booking-1", content: "Hello host" }, guestAuth);

    expect(result.statusCode).toBe(201);
    expect(mockThreadRepository.createThread).toHaveBeenCalledTimes(1);
    expect(mockThreadRepository.findThreadByBookingId).toHaveBeenCalledTimes(2);
    expect(mockMessageRepository.createMessage).toHaveBeenCalledTimes(1);
    expect(mockMessageRepository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "thread-1",
        senderId: "guest-1",
        recipientId: "host-1",
        content: "Hello host",
      })
    );
  });

  test("does not swallow unrelated booking-thread creation errors", async () => {
    mockBookingRepository.getBookingById.mockResolvedValue(booking());
    mockThreadRepository.findThreadByBookingId.mockResolvedValue(null);
    mockThreadRepository.createThread.mockRejectedValue(new Error("database offline"));

    await expect(service.sendMessage({ bookingId: "booking-1", content: "Hello host" }, guestAuth)).rejects.toThrow(
      "database offline"
    );
    expect(mockMessageRepository.createMessage).not.toHaveBeenCalled();
  });
});
