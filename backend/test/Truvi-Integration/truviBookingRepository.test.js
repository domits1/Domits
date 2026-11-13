import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import Database from "database";
import { TruviBookingRepository } from "../../functions/Truvi-Integration/data/truviBookingRepository.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const bookingRow = (overrides = {}) => ({
  id: "booking-1",
  arrivaldate: "1793000000000",
  departuredate: "1793345600000",
  createdat: "1791800000000",
  guestid: "guest-1",
  guestname: "John Doe",
  guest_email: null,
  hostid: "host-1",
  hostname: "Host BV",
  property_id: "property-1",
  booking_source: null,
  title: "Villa Zon",
  street: "Kinderhuissingel",
  housenumber: 6,
  housenumberextension: "k",
  city: "Haarlem",
  country: "Netherlands",
  postalcode: "2013AS",
  ...overrides,
});

const mockClient = (bookingRows, ruleRows = []) => {
  const query = jest.fn().mockResolvedValueOnce(bookingRows).mockResolvedValueOnce(ruleRows);
  Database.getInstance.mockResolvedValue({ query, options: { schema: "main" } });
  return query;
};

describe("TruviBookingRepository.listBookingsToScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("only asks for paid upcoming bookings without a Truvi result", async () => {
    const query = mockClient([]);

    const result = await new TruviBookingRepository().listBookingsToScreen({ now: 1000, limit: 5 });

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("b.status = $1");
    expect(sql).toContain("b.arrivaldate > $2");
    expect(sql).toContain("'truvi:' || b.id");
    expect(sql).toContain("g.id IS NULL");
    expect(params).toEqual(["Paid", 1000, 5]);
    expect(result).toEqual([]);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("uses the test schema when tests run", async () => {
    const query = mockClient([]);

    await new TruviBookingRepository().listBookingsToScreen({ now: 1000 });

    expect(query.mock.calls[0][0]).toContain("test.booking");
  });

  it("caps the limit and falls back to the default for nonsense", async () => {
    const query = mockClient([]);
    await new TruviBookingRepository().listBookingsToScreen({ now: 1, limit: 500 });
    expect(query.mock.calls[0][1][2]).toBe(50);

    const second = mockClient([]);
    await new TruviBookingRepository().listBookingsToScreen({ now: 1, limit: "abc" });
    expect(second.mock.calls[0][1][2]).toBe(10);
  });

  it("returns the booking shaped for the Truvi mapper with its PetsAllowed rule", async () => {
    const query = mockClient([bookingRow()], [{ property_id: "property-1", rule: "PetsAllowed", value: true }]);

    const [input] = await new TruviBookingRepository().listBookingsToScreen({ now: 1000 });

    expect(query.mock.calls[1][1]).toEqual(["PetsAllowed", "property-1"]);
    expect(input).toEqual({
      booking: {
        id: "booking-1",
        arrivaldate: 1793000000000,
        departuredate: 1793345600000,
        createdat: 1791800000000,
        guestname: "John Doe",
        guest_email: null,
      },
      property: { id: "property-1", title: "Villa Zon" },
      location: {
        street: "Kinderhuissingel",
        housenumber: 6,
        housenumberextension: "k",
        city: "Haarlem",
        country: "Netherlands",
        postalcode: "2013AS",
      },
      rules: [{ property_id: "property-1", rule: "PetsAllowed", value: true }],
      guestId: "guest-1",
      hostId: "host-1",
      hostName: "Host BV",
      bookingSource: null,
    });
  });

  it("gives no location when the property has no location row", async () => {
    mockClient([bookingRow({ street: null, housenumber: null, housenumberextension: null, city: null, country: null, postalcode: null })]);

    const [input] = await new TruviBookingRepository().listBookingsToScreen({ now: 1000 });

    expect(input.location).toBeNull();
    expect(input.rules).toEqual([]);
  });
});