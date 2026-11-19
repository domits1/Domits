jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const MessageRepository = require("./messageRepository.js").default;

const mockQueryBuilder = (affected) => {
  const queryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected }),
  };
  Database.getInstance.mockResolvedValue({ createQueryBuilder: jest.fn(() => queryBuilder) });
  return queryBuilder;
};

describe("MessageRepository retry persistence", () => {
  test("claimFailedMessageForRetry flips only a failed row to pending and reports whether it won the claim", async () => {
    const queryBuilder = mockQueryBuilder(1);

    const affected = await new MessageRepository().claimFailedMessageForRetry("message-1");

    expect(queryBuilder.set).toHaveBeenCalledWith({ deliveryStatus: "pending" });
    expect(queryBuilder.where).toHaveBeenCalledWith({ id: "message-1", deliveryStatus: "failed" });
    expect(affected).toBe(1);
  });

  test("claimFailedMessageForRetry reports 0 when the row was no longer failed", async () => {
    mockQueryBuilder(0);

    expect(await new MessageRepository().claimFailedMessageForRetry("message-1")).toBe(0);
  });

  test("updateDeliveryResult writes the outcome onto the existing row id", async () => {
    const queryBuilder = mockQueryBuilder(1);
    const repository = new MessageRepository();
    jest.spyOn(repository, "getMessageById").mockResolvedValue({ id: "message-1", deliveryStatus: "sent" });

    const patch = {
      deliveryStatus: "sent",
      platformMessageId: "channex-msg-1",
      errorCode: null,
      errorMessage: null,
      metadata: "{}",
    };
    const updated = await repository.updateDeliveryResult("message-1", patch);

    expect(queryBuilder.set).toHaveBeenCalledWith(patch);
    expect(queryBuilder.where).toHaveBeenCalledWith({ id: "message-1" });
    expect(updated).toEqual({ id: "message-1", deliveryStatus: "sent" });
  });
});
