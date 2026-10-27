jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("database").default;
const { DataSource, SelectQueryBuilder } = require("typeorm");
const { Booking } = require("database/models/Booking");
const BookingService =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingService.js").default;
const ReservationRepository =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js").default;

const ALLOWED_FIELDS = ["arrivaldate", "departuredate", "guestid", "guests", "id", "property_id", "status"];

const fullRow = (overrides) => ({
  arrivaldate: 1782000000000,
  departuredate: 1782300000000,
  guests: 2,
  status: "Paid",
  guestname: "Guest Name",
  hostname: "Host Name",
  guest_email: "guest@example.com",
  total_price: 500,
  special_request: "late arrival",
  property_id: "property-1",
  ...overrides,
});

const ROWS = [
  fullRow({ id: "booking-paid", paymentid: "pi_paid", guestid: "guest-1", hostid: "host-1" }),
  fullRow({ id: "inquiry-a", paymentid: "FAILED: ", guestid: "guest-2", hostid: "host-1", status: "Inquiry" }),
  fullRow({ id: "inquiry-b", paymentid: "FAILED: ", guestid: "guest-3", hostid: "host-2", status: "Inquiry" }),
];

let executed;
let read;

beforeAll(async () => {
  const database = new DataSource({ type: "postgres", schema: "main", entities: [Booking] });
  await database.buildMetadatas();
  Database.getInstance.mockResolvedValue(database);
});

beforeEach(() => {
  executed = [];
  read = jest.spyOn(SelectQueryBuilder.prototype, "getMany").mockImplementation(async function () {
    executed.push(this);
    const parameters = this.getParameters();
    const selected = this.expressionMap.selects.map(({ selection }) => selection.split(".").pop());
    return ROWS.filter((row) => row.paymentid === parameters.paymentid)
      .filter(
        (row) =>
          parameters.userId === undefined || row.guestid === parameters.userId || row.hostid === parameters.userId
      )
      .map((row) =>
        selected.includes("booking") ? row : Object.fromEntries(selected.map((field) => [field, row[field]]))
      );
  });
});

afterEach(() => {
  read.mockRestore();
});

const buildService = (authenticateUser) =>
  new BookingService({
    reservationRepository: new ReservationRepository(),
    authManager: { authenticateUser: jest.fn(authenticateUser) },
  });

const readEvent = (paymentID, Authorization = "token") => ({
  Authorization,
  event: { readType: "paymentId", paymentID },
});

describe("reading a booking by payment id", () => {
  test("gives the guest their own booking with only the fields the confirmation page needs", async () => {
    const service = buildService(async () => ({ sub: "guest-1" }));

    const result = await service.read(readEvent("pi_paid"));

    expect(result.statusCode).toBe(200);
    expect(result.response).toHaveLength(1);
    expect(Object.keys(result.response[0]).sort()).toEqual(ALLOWED_FIELDS);
    expect(result.response[0]).toMatchObject({ id: "booking-paid", guestid: "guest-1" });
  });

  test("gives the host of the booking the same booking", async () => {
    const service = buildService(async () => ({ sub: "host-1" }));

    const result = await service.read(readEvent("pi_paid"));

    expect(result.response.map(({ id }) => id)).toEqual(["booking-paid"]);
  });

  test("answers 404 for someone else's payment id, the same as for one that does not exist", async () => {
    const service = buildService(async () => ({ sub: "guest-9" }));

    await expect(service.read(readEvent("pi_paid"))).rejects.toMatchObject({
      statusCode: 404,
      message: "No booking found.",
    });
    await expect(service.read(readEvent("pi_missing"))).rejects.toMatchObject({
      statusCode: 404,
      message: "No booking found.",
    });
  });

  test("never hands out other people's inquiries through the shared placeholder payment id", async () => {
    const service = buildService(async () => ({ sub: "guest-9" }));

    await expect(service.read(readEvent("FAILED: "))).rejects.toMatchObject({ statusCode: 404 });
  });

  test("binds the payment id and the caller as parameters and scopes the query to guest or host", async () => {
    const service = buildService(async () => ({ sub: "guest-1" }));

    await expect(service.read(readEvent("pi_paid' OR '1'='1"))).rejects.toMatchObject({ statusCode: 404 });

    const [query] = executed;
    expect(query.getQuery()).toContain('"booking"."paymentid" = :paymentid');
    expect(query.getQuery()).toContain('("booking"."guestid" = :userId OR "booking"."hostid" = :userId)');
    expect(query.getParameters()).toMatchObject({ paymentid: "pi_paid' OR '1'='1", userId: "guest-1" });
  });

  test("does not touch the database when the token is missing or invalid", async () => {
    const failure = Object.assign(new Error("Invalid Access Token"), { name: "NotAuthorizedException" });
    const service = buildService(async () => {
      throw failure;
    });

    await expect(service.read(readEvent("pi_paid", undefined))).rejects.toBe(failure);
    expect(read).not.toHaveBeenCalled();
  });

  test("answers 401 and does not touch the database when the token has no user id", async () => {
    const service = buildService(async () => ({ email: "someone@example.com" }));

    await expect(service.read(readEvent("pi_paid"))).rejects.toMatchObject({ statusCode: 401 });
    expect(read).not.toHaveBeenCalled();
  });

  test.each([
    ["the host who owns those inquiries", "host-1", "FAILED: "],
    ["the guest of one of those inquiries", "guest-2", "FAILED: "],
    ["a caller with a lowercase variant", "guest-2", " failed: "],
    ["a caller without any payment id", "guest-1", ""],
  ])("answers 404 for %s without querying the database", async (_label, sub, paymentID) => {
    const service = buildService(async () => ({ sub }));

    await expect(service.read(readEvent(paymentID))).rejects.toMatchObject({
      statusCode: 404,
      message: "No booking found.",
    });
    expect(read).not.toHaveBeenCalled();
  });
});
