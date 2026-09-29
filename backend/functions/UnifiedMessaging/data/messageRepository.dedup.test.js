jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const MessageRepository = require("./messageRepository.js").default;

const NEW_DEDUP_CONSTRAINT = "idx_unified_message_platform_message_unique";

const fluentExistsQueryBuilder = (count) => {
  const builder = {
    where: jest.fn(() => builder),
    andWhere: jest.fn(() => builder),
    getCount: jest.fn(async () => count),
  };
  return builder;
};

const fluentInsertQueryBuilder = (execute) => ({
  insert: jest.fn(() => ({
    into: jest.fn(() => ({
      values: jest.fn(() => ({ execute })),
    })),
  })),
});

const mockClient = ({ existingCount = 0, insertExecute }) => ({
  getRepository: jest.fn(() => ({
    createQueryBuilder: jest.fn(() => fluentExistsQueryBuilder(existingCount)),
  })),
  createQueryBuilder: jest.fn(() => fluentInsertQueryBuilder(insertExecute)),
});

const uniqueViolation = (constraint) => {
  const error = new Error(`duplicate key value violates unique constraint "${constraint}"`);
  error.code = "23505";
  error.constraint = constraint;
  error.detail = `Key (threadId, platformMessageId)=(thread-1, platform-msg-1) already exists.`;
  return error;
};

const uniqueViolationWithoutConstraintName = (detail) => {
  const error = new Error("duplicate key value violates unique constraint");
  error.code = "23505";
  error.detail = detail;
  return error;
};

describe("MessageRepository external message de-duplication", () => {
  test("inserts a new external message and reports it as inserted", async () => {
    const insertExecute = jest.fn(async () => ({}));
    Database.getInstance.mockResolvedValue(mockClient({ existingCount: 0, insertExecute }));
    const repository = new MessageRepository();

    const result = await repository.createMessageIfNotExists({
      threadId: "thread-1",
      senderId: "guest-1",
      recipientId: "host-1",
      content: "Hello",
      platformMessageId: "platform-msg-1",
    });

    expect(result).toBe(true);
    expect(insertExecute).toHaveBeenCalledTimes(1);
  });

  test("treats a duplicate external message delivery as already stored, without throwing", async () => {
    const insertExecute = jest.fn(async () => {
      throw uniqueViolation(NEW_DEDUP_CONSTRAINT);
    });
    Database.getInstance.mockResolvedValue(mockClient({ existingCount: 0, insertExecute }));
    const repository = new MessageRepository();

    await expect(
      repository.createMessageIfNotExists({
        threadId: "thread-1",
        senderId: "guest-1",
        recipientId: "host-1",
        content: "Hello again",
        platformMessageId: "platform-msg-1",
      })
    ).resolves.toBe(false);
  });

  test("treats a duplicate as already stored when the driver omits error.constraint but the detail names the dedup index", async () => {
    const insertExecute = jest.fn(async () => {
      throw uniqueViolationWithoutConstraintName(
        `Key (threadId, platformMessageId)=(thread-1, platform-msg-1) already exists. (${NEW_DEDUP_CONSTRAINT})`
      );
    });
    Database.getInstance.mockResolvedValue(mockClient({ existingCount: 0, insertExecute }));
    const repository = new MessageRepository();

    await expect(
      repository.createMessageIfNotExists({
        threadId: "thread-1",
        senderId: "guest-1",
        recipientId: "host-1",
        content: "Hello again",
        platformMessageId: "platform-msg-1",
      })
    ).resolves.toBe(false);
  });

  test("does not swallow a unique violation unrelated to the dedup constraint", async () => {
    const insertExecute = jest.fn(async () => {
      throw uniqueViolation("id_unified_message_UNIQUE");
    });
    Database.getInstance.mockResolvedValue(mockClient({ existingCount: 0, insertExecute }));
    const repository = new MessageRepository();

    await expect(
      repository.createMessageIfNotExists({
        threadId: "thread-1",
        senderId: "guest-1",
        recipientId: "host-1",
        content: "Hello",
        platformMessageId: "platform-msg-1",
      })
    ).rejects.toThrow(/id_unified_message_UNIQUE/);
  });

  test("skips the insert entirely when the sequential pre-check already found the message", async () => {
    const insertExecute = jest.fn(async () => ({}));
    Database.getInstance.mockResolvedValue(mockClient({ existingCount: 1, insertExecute }));
    const repository = new MessageRepository();

    const result = await repository.createMessageIfNotExists({
      threadId: "thread-1",
      senderId: "guest-1",
      recipientId: "host-1",
      content: "Hello",
      platformMessageId: "platform-msg-1",
    });

    expect(result).toBe(false);
    expect(insertExecute).not.toHaveBeenCalled();
  });

  test("keeps inserting messages with no platformMessageId, never deduplicating DOMITS-internal sends", async () => {
    const insertExecute = jest.fn(async () => ({}));
    Database.getInstance.mockResolvedValue(mockClient({ existingCount: 0, insertExecute }));
    const repository = new MessageRepository();

    const first = await repository.createMessageIfNotExists({
      threadId: "thread-1",
      senderId: "guest-1",
      recipientId: "host-1",
      content: "Hi",
      platformMessageId: null,
    });
    const second = await repository.createMessageIfNotExists({
      threadId: "thread-1",
      senderId: "guest-1",
      recipientId: "host-1",
      content: "Hi again",
      platformMessageId: null,
    });

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(insertExecute).toHaveBeenCalledTimes(2);
  });
});
