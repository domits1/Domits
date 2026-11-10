jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import ChannexExternalBookingImportRepository, {
  buildDeterministicChannexBookingId,
} from "../../.shared/channelManagement/repositories/channexExternalBookingImportRepository.js";

const INSERT_COLUMNS = [
  "id",
  "arrivaldate",
  "departuredate",
  "createdat",
  "guestid",
  "guests",
  "hostid",
  "latepayment",
  "paymentid",
  "property_id",
  "status",
  "guestname",
  "hostname",
  "cancellation_policy",
  "bookingtype",
  "total_price",
  "booking_source",
];

const setup = () => {
  const client = { options: { schema: "main" }, query: jest.fn().mockResolvedValue([]) };
  Database.getInstance.mockResolvedValue(client);
  const repository = new ChannexExternalBookingImportRepository({ channexAriOutboxWriter: { enqueueChannexAriChange: jest.fn() } });
  repository.getBookingById = jest.fn().mockResolvedValue({ id: "booking-1" });
  return { repository, client };
};

const insertedRow = (client) =>
  Object.fromEntries(INSERT_COLUMNS.map((column, index) => [column, client.query.mock.calls[0][1][index]]));

const booking = {
  bookingId: "booking-1",
  propertyId: "property-1",
  hostId: "host-1",
  externalReservationId: "reservation-1",
  arrivalDateMs: Date.parse("2026-11-01"),
  departureDateMs: Date.parse("2026-11-04"),
};

describe("Channex booking import values that existing bookings depend on", () => {
  beforeEach(() => jest.clearAllMocks());

  test("keeps the same deterministic booking id, so a later revision finds the booking it created", () => {
    expect(buildDeterministicChannexBookingId("integration-1", "channex-booking-1")).toBe("641f53f0-3f43-4144-a518-67bde24c708f");
    expect(buildDeterministicChannexBookingId(" integration-1 ", " channex-booking-1 ")).toBe("641f53f0-3f43-4144-a518-67bde24c708f");
  });

  test("stores an imported booking with the Channex guest, payment, host and booking type values", async () => {
    const { repository, client } = setup();

    await repository.createExternalBooking(booking);

    expect(insertedRow(client)).toMatchObject({
      guestid: "CHANNEX_GUEST:reservation-1",
      paymentid: "CHANNEX:reservation-1",
      guestname: "Channex guest",
      hostname: "Channex",
      bookingtype: "channex",
      status: "Paid",
    });
  });

  test("keeps the guest name when Channex sends one", async () => {
    const { repository, client } = setup();

    await repository.createExternalBooking({ ...booking, guestName: "Jane Doe" });

    expect(insertedRow(client).guestname).toBe("Jane Doe");
  });

  test("falls back to the Channex guest name on a modification without a name", async () => {
    const { repository, client } = setup();

    await repository.updateImportedBooking({ ...booking, guestName: "  " });

    expect(client.query.mock.calls[0][1][3]).toBe("Channex guest");
  });
});
