jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));

const Database = require("database").default;
const ReservationRepository = require("../../functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js").default;

const query = (rawResult = null) => {
  const builder = {};
  ["insert", "into", "values", "update", "set", "where", "andWhere", "select", "from", "orIgnore"].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.execute = jest.fn(async () => ({ affected: 1 }));
  builder.getRawOne = jest.fn(async () => rawResult);
  return builder;
};

const channexChange = {
  domitsPropertyId: "property-1",
  changeTypes: ["availability"],
  dateFrom: "2026-11-01",
  dateTo: "2026-11-03",
  source: "BOOKING",
};

const setup = ({ latestVersion = null } = {}) => {
  const queries = { update: query(), latest: query({ version: latestVersion }), insert: query() };
  const manager = {
    createQueryBuilder: jest
      .fn()
      .mockReturnValueOnce(queries.update)
      .mockReturnValueOnce(queries.latest)
      .mockReturnValueOnce(queries.insert),
  };
  const client = { createQueryBuilder: jest.fn(() => query()), transaction: jest.fn(async (work) => work(manager)) };
  Database.getInstance.mockResolvedValue(client);
  const channexAriOutboxWriter = { enqueueChannexAriChange: jest.fn().mockResolvedValue(true) };
  const repository = new ReservationRepository({ channexAriOutboxWriter });
  return { repository, manager, client, queries, channexAriOutboxWriter };
};

const arrival = Date.parse("2026-11-10");
const departure = Date.parse("2026-11-12");

describe("ReservationRepository booking dates changed outbox event", () => {
  beforeEach(() => jest.clearAllMocks());

  test("saves the new dates and the event in one transaction", async () => {
    const { repository, client, queries, manager } = setup();

    await repository.updateBookingDates("booking-1", arrival, departure, [], { notifyAutomations: true });

    expect(client.transaction).toHaveBeenCalledTimes(1);
    expect(manager.createQueryBuilder).toHaveBeenCalledTimes(3);
    expect(client.createQueryBuilder).not.toHaveBeenCalled();
    expect(queries.update.set).toHaveBeenCalledWith({ arrivaldate: arrival, departuredate: departure });
    expect(queries.insert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "booking-1",
        eventType: "BOOKING_DATES_CHANGED",
        eventVersion: 1,
        status: "PENDING",
        attemptCount: 0,
        failureReason: null,
        processedAt: null,
        occurredAt: expect.any(Number),
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      })
    );
  });

  test("numbers the event per booking after the latest one", async () => {
    const { repository, queries } = setup({ latestVersion: 2 });

    await repository.updateBookingDates("booking-1", arrival, departure, [], { notifyAutomations: true });

    expect(queries.latest.where).toHaveBeenCalledWith(
      "event.bookingId = :bookingId AND event.eventType = :eventType",
      { bookingId: "booking-1", eventType: "BOOKING_DATES_CHANGED" }
    );
    expect(queries.insert.values).toHaveBeenCalledWith(expect.objectContaining({ eventVersion: 3 }));
  });

  test("a version that comes back as text still counts up", async () => {
    const { repository, queries } = setup({ latestVersion: "4" });

    await repository.updateBookingDates("booking-1", arrival, departure, [], { notifyAutomations: true });

    expect(queries.insert.values).toHaveBeenCalledWith(expect.objectContaining({ eventVersion: 5 }));
  });

  test("does not ignore a conflicting event row", async () => {
    const { repository, queries } = setup();

    await repository.updateBookingDates("booking-1", arrival, departure, [], { notifyAutomations: true });

    expect(queries.insert.execute).toHaveBeenCalledTimes(1);
    expect(queries.insert.orIgnore).not.toHaveBeenCalled();
  });

  test.each([[undefined], [{}], [{ notifyAutomations: false }]])(
    "writes no event and no transaction when automations are not notified (%j)",
    async (options) => {
      const { repository, client, manager } = setup();

      await repository.updateBookingDates("booking-1", arrival, departure, [], options);

      expect(client.transaction).not.toHaveBeenCalled();
      expect(manager.createQueryBuilder).not.toHaveBeenCalled();
      expect(client.createQueryBuilder).toHaveBeenCalledTimes(1);
    }
  );

  test("saves the Channex rows and the event in the same transaction", async () => {
    const { repository, client, manager, channexAriOutboxWriter, queries } = setup();

    await repository.updateBookingDates("booking-1", arrival, departure, [channexChange], { notifyAutomations: true });

    expect(client.transaction).toHaveBeenCalledTimes(1);
    expect(channexAriOutboxWriter.enqueueChannexAriChange).toHaveBeenCalledWith(manager, channexChange);
    expect(queries.insert.execute).toHaveBeenCalledTimes(1);
  });

  test("a failing event write fails the date change instead of being swallowed", async () => {
    const { repository, queries } = setup();
    queries.insert.execute.mockRejectedValue(new Error("outbox down"));

    await expect(
      repository.updateBookingDates("booking-1", arrival, departure, [], { notifyAutomations: true })
    ).rejects.toThrow("outbox down");
  });

  test("a commit conflict runs the transaction again and reads the counter again", async () => {
    const first = { update: query(), latest: query({ version: 1 }), insert: query() };
    const second = { update: query(), latest: query({ version: 2 }), insert: query() };
    const managers = [first, second].map((queries) => ({
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(queries.update)
        .mockReturnValueOnce(queries.latest)
        .mockReturnValueOnce(queries.insert),
    }));
    const transaction = jest
      .fn()
      .mockImplementationOnce(async (work) => {
        await work(managers[0]);
        throw Object.assign(new Error("conflict"), { code: "40001" });
      })
      .mockImplementationOnce(async (work) => work(managers[1]));
    Database.getInstance.mockResolvedValue({ transaction, createQueryBuilder: jest.fn(() => query()) });
    const repository = new ReservationRepository({ channexAriOutboxWriter: { enqueueChannexAriChange: jest.fn() } });

    await repository.updateBookingDates("booking-1", arrival, departure, [], { notifyAutomations: true });

    expect(transaction).toHaveBeenCalledTimes(2);
    expect(first.insert.values).toHaveBeenCalledWith(expect.objectContaining({ eventVersion: 2 }));
    expect(second.insert.values).toHaveBeenCalledWith(expect.objectContaining({ eventVersion: 3 }));
  });
});
