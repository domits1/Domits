import { bookingToCreateRequest, mapCreateResponse } from "../../functions/Truvi-Integration/util/truviMapper.js";

const input = () => ({
  booking: {
    id: "booking-1",
    arrivaldate: Date.UTC(2026, 11, 1),
    departuredate: Date.UTC(2026, 11, 5),
    createdat: Date.UTC(2026, 9, 6),
    guestname: "John Van Doe",
    guest_email: "john@example.com",
  },
  property: { id: "property-1", title: "Villa Zon", petsAllowed: false },
  location: { street: "Kinderhuissingel", housenumber: 6, housenumberextension: "k", city: "Haarlem", countryIso: "NLD", postalcode: "2013AS" },
  host: { name: "Host BV", email: "host@example.com" },
  protection: { extendedAmount: 1000 },
  now: new Date("2026-10-06T09:00:00.000Z"),
});

describe("bookingToCreateRequest", () => {
  test("maps a Domits booking to the Truvi create request", () => {
    const req = bookingToCreateRequest(input());
    expect(req.metadata.timeStamp).toBe("2026-10-06T09:00:00.00");
    expect(req.metadata.echoToken).toHaveLength(36);
    expect(req.listing).toEqual({
      listingId: "property-1",
      listingName: "Villa Zon",
      petsAllowed: false,
      address: { addressLine1: "Kinderhuissingel 6k", town: "Haarlem", countryIso: "NLD", postcode: "2013AS" },
    });
    expect(req.reservation).toEqual({
      reservationId: "booking-1",
      checkIn: "2026-12-01",
      checkOut: "2026-12-05",
      channel: "Direct web",
      creationDate: "2026-10-06",
    });
    expect(req.guest).toEqual({ firstName: "John", lastName: "Van Doe", email: "john@example.com" });
    expect(req.protection).toEqual({ type: "Complete Protection", extendedAmount: 1000 });
  });

  test("rejects an extendedAmount Truvi does not accept", () => {
    const data = input();
    data.protection.extendedAmount = 123;
    expect(() => bookingToCreateRequest(data)).toThrow("extendedAmount");
  });

  test("rejects a guest without email and phone", () => {
    const data = input();
    delete data.booking.guest_email;
    expect(() => bookingToCreateRequest(data)).toThrow("email or a phone");
  });
});

describe("mapCreateResponse", () => {
  test.each([
    ["Approved", "PASSED"],
    ["Flagged", "FLAGGED"],
    ["Rejected", "FAILED"],
    ["Something new", "ERROR"],
  ])("maps Truvi status %s to %s", (truviStatus, domitsStatus) => {
    const result = mapCreateResponse({ verification: { verificationId: "v-1", status: truviStatus } });
    expect(result).toEqual({ providerAssessmentId: "v-1", status: domitsStatus, flaggedReason: null });
  });

  test("keeps the flagged reason", () => {
    const result = mapCreateResponse({ verification: { verificationId: "v-1", status: "Flagged", flaggedReason: "Invalid Email" } });
    expect(result.flaggedReason).toBe("Invalid Email");
  });
});
