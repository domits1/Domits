jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const MessageRepository = require("./messageRepository.js").default;

const ITEM = { url: "https://example.com/a.png", type: "image", name: null };

const insertedValues = () => {
  const values = jest.fn(() => ({ execute: jest.fn(async () => ({})) }));
  Database.getInstance.mockResolvedValue({
    createQueryBuilder: jest.fn(() => ({ insert: () => ({ into: () => ({ values }) }) })),
  });
  return values;
};

const baseMessage = { threadId: "thread-1", senderId: "host-1", recipientId: "guest-1", content: "hi" };

describe("MessageRepository.createMessage attachments", () => {
  test("stores an array of attachments as a JSON string", async () => {
    const values = insertedValues();

    await new MessageRepository().createMessage({ ...baseMessage, attachments: [ITEM] });

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ attachments: JSON.stringify([ITEM]) }));
  });

  test("keeps a string of attachments as it is", async () => {
    const values = insertedValues();
    const stored = JSON.stringify([ITEM]);

    await new MessageRepository().createMessage({ ...baseMessage, attachments: stored });

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ attachments: stored }));
  });

  test.each([[null], [undefined]])("stores %p attachments as null", async (attachments) => {
    const values = insertedValues();

    await new MessageRepository().createMessage({ ...baseMessage, attachments });

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ attachments: null }));
  });

  test("returns the attachments the caller passed in, not the stored string", async () => {
    insertedValues();

    const created = await new MessageRepository().createMessage({ ...baseMessage, attachments: [ITEM] });

    expect(created.attachments).toEqual([ITEM]);
  });
});
