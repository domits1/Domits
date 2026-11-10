jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import ChannexExternalBookingImportRepository, {
  buildDeterministicBookingId,
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

const setup = (options = {}) => {
  const client = { options: { schema: "main" }, query: jest.fn().mockResolvedValue([]) };
  Database.getInstance.mockResolvedValue(client);
  const repository = new ChannexExternalBookingImportRepository({
    channexAriOutboxWriter: { enqueueChannexAriChange: jest.fn() },
    ...options,
  });
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

const OTHER_CHANNEL_PROFILE = Object.freeze({
  channel: "OTHER",
  guestIdPrefix: "OTHER_GUEST",
  paymentIdPrefix: "OTHER",
  hostName: "Other channel",
  bookingType: "other",
  fallbackGuestName: "Other channel guest",
});

describe("booking import for another channel", () => {
  beforeEach(() => jest.clearAllMocks());

  test("stores the values of the profile it was given", async () => {
    const { repository, client } = setup({ profile: OTHER_CHANNEL_PROFILE });

    await repository.createExternalBooking(booking);

    expect(insertedRow(client)).toMatchObject({
      guestid: "OTHER_GUEST:reservation-1",
      paymentid: "OTHER:reservation-1",
      guestname: "Other channel guest",
      hostname: "Other channel",
      bookingtype: "other",
    });
  });

  test("uses the fallback name of the profile on a modification without a name", async () => {
    const { repository, client } = setup({ profile: OTHER_CHANNEL_PROFILE });

    await repository.updateImportedBooking({ ...booking, guestName: null });

    expect(client.query.mock.calls[0][1][3]).toBe("Other channel guest");
  });

  test("builds a booking id per channel, so the same reservation id on two channels never gives the same booking", () => {
    expect(buildDeterministicBookingId("CHANNEX", "integration-1", "channex-booking-1")).toBe("641f53f0-3f43-4144-a518-67bde24c708f");
    expect(buildDeterministicBookingId("OTHER", "integration-1", "channex-booking-1")).not.toBe("641f53f0-3f43-4144-a518-67bde24c708f");
    expect(buildDeterministicBookingId("OTHER", "integration-1", "channex-booking-1")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  test.each(["channel", "guestIdPrefix", "paymentIdPrefix", "hostName", "bookingType", "fallbackGuestName"])(
    "refuses a profile without %s",
    (field) => {
      expect(
        () => new ChannexExternalBookingImportRepository({ profile: { ...OTHER_CHANNEL_PROFILE, [field]: " " } })
      ).toThrow(`booking import profile needs ${field}`);
    }
  );
});
