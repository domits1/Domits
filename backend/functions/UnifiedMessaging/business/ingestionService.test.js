import IngestionService from "./ingestionService.js";

const mockThreadRepo = {
  upsertExternalThread: jest.fn(),
  updateThreadActivity: jest.fn(),
};
const mockMessageRepo = {
  createMessageIfNotExists: jest.fn(),
};

jest.mock("../data/threadRepository.js", () => ({
  __esModule: true,
  default: jest.fn(() => mockThreadRepo),
}));

jest.mock("../data/messageRepository.js", () => ({
  __esModule: true,
  default: jest.fn(() => mockMessageRepo),
}));

const buildPayload = (messages) => ({
  integrationAccountId: "integration-1",
  platform: "CHANNEX",
  externalThreadId: "channex-thread-1",
  hostId: "host-1",
  guestId: "guest-1",
  messages,
});

describe("IngestionService.ingestExternalThread stored message ids", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockThreadRepo.upsertExternalThread.mockResolvedValue({ id: "thread-1" });
    mockThreadRepo.updateThreadActivity.mockResolvedValue(undefined);
  });

  test("returns the stored id of each inserted message keyed by its platformMessageId", async () => {
    mockMessageRepo.createMessageIfNotExists
      .mockResolvedValueOnce({ id: "stored-1" })
      .mockResolvedValueOnce({ id: "stored-2" });

    const result = await new IngestionService().ingestExternalThread(
      buildPayload([
        { platformMessageId: "pm-1", senderId: "guest-1", recipientId: "host-1", content: "one" },
        { platformMessageId: "pm-2", senderId: "guest-1", recipientId: "host-1", content: "two" },
      ])
    );

    expect(result.response.insertedMessages).toBe(2);
    expect(result.response.insertedMessageIds).toEqual({ "pm-1": "stored-1", "pm-2": "stored-2" });
  });

  test("leaves out messages that were not inserted because they already exist", async () => {
    mockMessageRepo.createMessageIfNotExists.mockResolvedValueOnce(false).mockResolvedValueOnce({ id: "stored-2" });

    const result = await new IngestionService().ingestExternalThread(
      buildPayload([
        { platformMessageId: "pm-1", senderId: "guest-1", recipientId: "host-1", content: "one" },
        { platformMessageId: "pm-2", senderId: "guest-1", recipientId: "host-1", content: "two" },
      ])
    );

    expect(result.response.insertedMessages).toBe(1);
    expect(result.response.insertedMessageIds).toEqual({ "pm-2": "stored-2" });
  });

  test("returns an empty map for a duplicate delivery", async () => {
    mockMessageRepo.createMessageIfNotExists.mockResolvedValue(false);

    const result = await new IngestionService().ingestExternalThread(
      buildPayload([{ platformMessageId: "pm-1", senderId: "guest-1", recipientId: "host-1", content: "one" }])
    );

    expect(result.response.insertedMessages).toBe(0);
    expect(result.response.insertedMessageIds).toEqual({});
  });
});
