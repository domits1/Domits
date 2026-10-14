export const createMockMessageRepository = () => ({
  createMessage: jest.fn(),
  getMessagesByThreadId: jest.fn(),
  markThreadMessagesRead: jest.fn(),
  getUnreadCountsForThreads: jest.fn(),
});

export const createMockThreadRepository = () => ({
  createThread: jest.fn(),
  findThread: jest.fn(),
  findThreadByBookingId: jest.fn(),
  getThreadById: jest.fn(),
  getThreadsForUser: jest.fn(),
  updateThreadActivity: jest.fn(),
  upsertExternalThread: jest.fn(),
});

export const createMockBookingRepository = () => ({
  getBookingById: jest.fn(),
  findBookingsForGuestHost: jest.fn(),
  findBookingsForGuestHostProperty: jest.fn(),
  hostOwnsProperty: jest.fn(),
});

export const hostAuth = { userId: "host-1", isGuest: false, isHost: true };

export const buildThread = (patch = {}) => ({
  id: "thread-1",
  hostId: "host-1",
  guestId: "guest-1",
  propertyId: "property-1",
  platform: "DOMITS",
  ...patch,
});
