jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const ThreadRepository = require("./threadRepository.js").default;

describe("ThreadRepository.updateThreadGuestId", () => {
  test("updates only that thread's guestId, leaving bookingId and every other field untouched", async () => {
    const whereMock = jest.fn().mockReturnThis();
    const setMock = jest.fn().mockReturnThis();
    const updateMock = jest.fn().mockReturnThis();
    const executeMock = jest.fn().mockResolvedValue({ affected: 1 });

    const queryBuilder = {
      update: updateMock,
      set: setMock,
      where: whereMock,
      execute: executeMock,
    };

    Database.getInstance.mockResolvedValue({
      createQueryBuilder: jest.fn(() => queryBuilder),
    });

    const repository = new ThreadRepository();
    await repository.updateThreadGuestId("thread-1", "CHANNEX_GUEST:channex-booking-1");

    expect(whereMock).toHaveBeenCalledWith("id = :id", { id: "thread-1" });
    expect(setMock).toHaveBeenCalledWith({
      guestId: "CHANNEX_GUEST:channex-booking-1",
      updatedAt: expect.any(Number),
    });
  });
});
