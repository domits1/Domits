jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("database").default;
const ReservationRepository = require("../../functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js").default;

const createBuilder = (result) => {
  const builder = {};
  ["update", "insert", "set", "where", "andWhere", "into", "values", "orIgnore"].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.execute = jest.fn(async () => result);
  return builder;
};

describe("ReservationRepository booking-paid outbox transaction", () => {
  test("persists one event only for the first Paid transition", async () => {
    const firstUpdate = createBuilder({ affected: 1 });
    const insert = createBuilder({ identifiers: [] });
    const repeatedUpdate = createBuilder({ affected: 0 });
    const manager = {
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(firstUpdate)
        .mockReturnValueOnce(insert)
        .mockReturnValueOnce(repeatedUpdate),
    };
    const transaction = jest.fn(async (callback) => callback(manager));
    Database.getInstance.mockResolvedValue({ transaction });
    const repository = new ReservationRepository();

    await expect(repository.markBookingPaidWithOutbox("booking-1")).resolves.toBe(true);
    await expect(repository.markBookingPaidWithOutbox("booking-1")).resolves.toBe(false);

    expect(transaction).toHaveBeenCalledTimes(2);
    expect(firstUpdate.andWhere).toHaveBeenCalledWith("status != :paidStatus", { paidStatus: "Paid" });
    expect(insert.values).toHaveBeenCalledWith(expect.objectContaining({
      bookingId: "booking-1",
      eventType: "BOOKING_PAID",
      eventVersion: 1,
      status: "PENDING",
    }));
    expect(insert.orIgnore).toHaveBeenCalledTimes(1);
    expect(insert.execute).toHaveBeenCalledTimes(1);
  });
});
