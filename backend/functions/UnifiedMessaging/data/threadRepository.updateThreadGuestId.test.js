jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const ThreadRepository = require("./threadRepository.js").default;

describe("ThreadRepository field updates (guestId, bookingId)", () => {
  test.each([
    [
      "updates only that thread's guestId, leaving bookingId and every other field untouched",
      "updateThreadGuestId",
      "guestId",
      "CHANNEX_GUEST:channex-booking-1",
    ],
    [
      "updates only that thread's bookingId, leaving guestId and every other field untouched",
      "updateThreadBookingId",
      "bookingId",
      "11111111-2222-4333-8444-555555555555",
    ],
  ])("%s", async (_description, method, field, value) => {
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
    await repository[method]("thread-1", value);

    expect(whereMock).toHaveBeenCalledWith("id = :id", { id: "thread-1" });
    expect(setMock).toHaveBeenCalledWith({
      [field]: value,
      updatedAt: expect.any(Number),
    });
  });
});
