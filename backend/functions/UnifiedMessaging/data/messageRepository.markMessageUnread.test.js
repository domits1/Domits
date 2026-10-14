jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const MessageRepository = require("./messageRepository.js").default;

describe("MessageRepository markMessageUnread", () => {
  test("only flips a message that is currently read, so affected reflects a genuine read-to-unread transition", async () => {
    const whereMock = jest.fn().mockReturnThis();
    const setMock = jest.fn().mockReturnThis();
    const updateMock = jest.fn().mockReturnThis();
    const executeMock = jest.fn().mockResolvedValue({ affected: 0 });

    const queryBuilder = {
      update: updateMock,
      set: setMock,
      where: whereMock,
      execute: executeMock,
    };

    Database.getInstance.mockResolvedValue({
      createQueryBuilder: jest.fn(() => queryBuilder),
    });

    const repository = new MessageRepository();
    await repository.markMessageUnread("message-1");

    expect(setMock).toHaveBeenCalledWith({ isRead: false });
    expect(whereMock).toHaveBeenCalledWith(expect.objectContaining({ id: "message-1", isRead: true }));
  });
});
