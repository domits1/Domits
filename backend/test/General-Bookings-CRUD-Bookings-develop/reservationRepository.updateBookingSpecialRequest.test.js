jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));

const Database = require("database").default;
const ReservationRepository = require("../../functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js").default;

const builder = (execute) => {
  const query = {};
  ["update", "set", "where"].forEach((method) => {
    query[method] = jest.fn(() => query);
  });
  query.execute = execute;
  return query;
};

describe("ReservationRepository.updateBookingSpecialRequest", () => {
  beforeEach(() => jest.clearAllMocks());

  test("updates the special request of the booking and returns the result with status 200", async () => {
    const query = builder(jest.fn(async () => ({ affected: 1 })));
    Database.getInstance.mockResolvedValue({ createQueryBuilder: jest.fn(() => query) });
    const repository = new ReservationRepository();

    const result = await repository.updateBookingSpecialRequest("booking-1", "Late check-in, please");

    expect(query.set).toHaveBeenCalledWith({ special_request: "Late check-in, please" });
    expect(query.where).toHaveBeenCalledWith("id = :id", { id: "booking-1" });
    expect(result).toEqual({ response: { affected: 1 }, statusCode: 200 });
  });

  test("lets a database error through, including a missing column, instead of reporting success", async () => {
    const missingColumn = Object.assign(new Error('column "special_request" does not exist'), { code: "42703" });
    const query = builder(jest.fn(async () => Promise.reject(missingColumn)));
    Database.getInstance.mockResolvedValue({ createQueryBuilder: jest.fn(() => query) });
    const repository = new ReservationRepository();

    await expect(repository.updateBookingSpecialRequest("booking-1", "Late check-in")).rejects.toBe(missingColumn);
  });
});
