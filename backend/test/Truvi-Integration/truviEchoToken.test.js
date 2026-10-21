import { bookingToCreateRequest, createEchoToken } from "../../functions/Truvi-Integration/util/truviMapper.js";

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const input = (bookingId) => ({
  booking: {
    id: bookingId,
    arrivaldate: Date.UTC(2026, 11, 1),
    departuredate: Date.UTC(2026, 11, 5),
    createdat: Date.UTC(2026, 9, 6),
    guestname: "John Doe",
    guest_email: "john@example.com",
  },
  property: { id: "property-1", title: "Villa Zon" },
  location: { street: "Kinderhuissingel", housenumber: 6, city: "Haarlem", country: "Netherlands", postalcode: "2013AS" },
  host: { name: "Host BV", email: "host@example.com" },
  protection: { extendedAmount: 1000 },
});

describe("createEchoToken", () => {
  test("is a 36 character GUID", () => {
    expect(createEchoToken("booking-1")).toMatch(GUID);
  });

  test("is the same for the same booking, so a retry reuses it", () => {
    expect(createEchoToken("booking-1")).toBe(createEchoToken("booking-1"));
  });

  test("is different for another booking", () => {
    expect(createEchoToken("booking-1")).not.toBe(createEchoToken("booking-2"));
  });

  test("refuses an empty booking id", () => {
    expect(() => createEchoToken("")).toThrow("bookingId is required");
  });
});

describe("bookingToCreateRequest echo token", () => {
  test("sends the booking's echo token", () => {
    expect(bookingToCreateRequest(input("booking-1")).metadata.echoToken).toBe(createEchoToken("booking-1"));
  });

  test("sends the same token on a second create for the same booking", () => {
    const first = bookingToCreateRequest(input("booking-1"));
    const second = bookingToCreateRequest(input("booking-1"));
    expect(second.metadata.echoToken).toBe(first.metadata.echoToken);
  });
});
