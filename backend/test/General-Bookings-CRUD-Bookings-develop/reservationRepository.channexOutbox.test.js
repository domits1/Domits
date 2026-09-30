jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));

const Database = require("database").default;
const ReservationRepository = require("../../functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js").default;

const change = {
  domitsPropertyId: "property-1",
  changeTypes: ["availability"],
  dateFrom: "2026-11-01",
  dateTo: "2026-11-03",
  source: "BOOKING",
};

const builder = () => {
  const query = {};
  ["insert", "into", "values", "update", "set", "where", "andWhere"].forEach((method) => {
    query[method] = jest.fn(() => query);
  });
  query.execute = jest.fn(async () => ({ affected: 1 }));
  return query;
};

const setup = () => {
  const manager = { createQueryBuilder: jest.fn(() => builder()) };
  const client = { createQueryBuilder: jest.fn(() => builder()), transaction: jest.fn(async (work) => work(manager)) };
  Database.getInstance.mockResolvedValue(client);
  const channexAriOutboxWriter = { enqueueChannexAriChange: jest.fn().mockResolvedValue(true) };
  const repository = new ReservationRepository({ channexAriOutboxWriter });
  repository.getBookingById = jest.fn().mockResolvedValue({ response: { id: "booking-1" } });
  return { repository, manager, client, channexAriOutboxWriter };
};

const requestBody = {
  general: { arrivalDate: Date.parse("2026-11-01"), departureDate: Date.parse("2026-11-04"), guests: 2 },
  identifiers: { property_Id: "property-1" },
};

describe("ReservationRepository Channex outbox rows", () => {
  beforeEach(() => jest.clearAllMocks());

  test("a new booking and its outbox row are saved in one transaction", async () => {
    const { repository, manager, client, channexAriOutboxWriter } = setup();

    await repository.addBookingToTable(requestBody, "guest-1", "host-1", "strict", "Awaiting Payment", "direct", change);

    expect(client.transaction).toHaveBeenCalledTimes(1);
    expect(manager.createQueryBuilder).toHaveBeenCalled();
    expect(channexAriOutboxWriter.enqueueChannexAriChange).toHaveBeenCalledWith(manager, change);
  });

  test("without a change the write runs as before, with no transaction and no row", async () => {
    const { repository, client, channexAriOutboxWriter } = setup();

    await repository.addBookingToTable(requestBody, "guest-1", "host-1", "strict", "Inquiry", "inquiry", null);

    expect(client.transaction).not.toHaveBeenCalled();
    expect(client.createQueryBuilder).toHaveBeenCalled();
    expect(channexAriOutboxWriter.enqueueChannexAriChange).not.toHaveBeenCalled();
  });

  test("new dates and the outbox row are saved in one transaction", async () => {
    const { repository, manager, channexAriOutboxWriter } = setup();

    await repository.updateBookingDates("booking-1", Date.parse("2026-11-10"), Date.parse("2026-11-12"), change);

    expect(channexAriOutboxWriter.enqueueChannexAriChange).toHaveBeenCalledWith(manager, change);
  });

  test("a status change and its outbox row are saved in one transaction", async () => {
    const { repository, manager, channexAriOutboxWriter } = setup();

    await repository.updateBookingStatus("booking-1", "Cancelled", change);

    expect(channexAriOutboxWriter.enqueueChannexAriChange).toHaveBeenCalledWith(manager, change);
  });

  test("a guest cancellation and its outbox row are saved in one transaction", async () => {
    const { repository, manager, client, channexAriOutboxWriter } = setup();
    const read = { where: jest.fn(() => read), getOne: jest.fn().mockResolvedValue({ id: "booking-1", guestid: "guest-1" }) };
    client.getRepository = jest.fn(() => ({ createQueryBuilder: () => read }));

    await repository.cancelBookingByGuest("booking-1", "guest-1", {}, change);

    expect(channexAriOutboxWriter.enqueueChannexAriChange).toHaveBeenCalledWith(manager, change);
  });
});
