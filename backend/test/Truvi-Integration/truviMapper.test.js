import { bookingToCreateRequest, mapCreateResponse, toCountryAlpha3 } from "../../functions/Truvi-Integration/util/truviMapper.js";

const input = () => ({
  booking: {
    id: "booking-1",
    arrivaldate: Date.UTC(2026, 11, 1),
    departuredate: Date.UTC(2026, 11, 5),
    createdat: Date.UTC(2026, 9, 6),
    guestname: "John Van Doe",
    guest_email: "john@example.com",
  },
  property: { id: "property-1", title: "Villa Zon" },
  location: { street: "Kinderhuissingel", housenumber: 6, housenumberextension: "k", city: "Haarlem", country: "Netherlands", postalcode: "2013AS" },
  rules: [
    { property_id: "property-1", rule: "SmokingAllowed", value: false },
    { property_id: "property-1", rule: "PetsAllowed", value: false },
  ],
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

  test("sets petsAllowed to true when the PetsAllowed rule is true", () => {
    const data = input();
    data.rules = [{ property_id: "property-1", rule: "PetsAllowed", value: true }];
    expect(bookingToCreateRequest(data).listing.petsAllowed).toBe(true);
  });

  test("sets petsAllowed to false when the property has no PetsAllowed rule", () => {
    const data = input();
    data.rules = [];
    expect(bookingToCreateRequest(data).listing.petsAllowed).toBe(false);
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

  test("rejects a country it cannot convert", () => {
    const data = input();
    data.location.country = "Atlantis";
    expect(() => bookingToCreateRequest(data)).toThrow("Unsupported country for Truvi: Atlantis");
  });

  test("converts a country outside Europe from a property_location row", () => {
    const data = input();
    data.location = { street: "Sukhumvit Road", housenumber: 12, housenumberextension: null, city: "Bangkok", country: "Thailand", postalcode: "10110" };
    expect(bookingToCreateRequest(data).listing.address).toEqual({
      addressLine1: "Sukhumvit Road 12",
      town: "Bangkok",
      countryIso: "THA",
      postcode: "10110",
    });
  });

  test("rejects a guest name without a last name", () => {
    const data = input();
    data.booking.guestname = "John";
    expect(() => bookingToCreateRequest(data)).toThrow("first and a last name");
  });

  test("uses Direct web as channel unless another channel is given", () => {
    expect(bookingToCreateRequest(input()).reservation.channel).toBe("Direct web");
    expect(bookingToCreateRequest({ ...input(), channel: "Airbnb" }).reservation.channel).toBe("Airbnb");
  });
});

describe("toCountryAlpha3", () => {
  test.each([
    ["Netherlands", "NLD"],
    ["Nederland", "NLD"],
    ["  germany ", "DEU"],
    ["United Kingdom", "GBR"],
    ["Thailand", "THA"],
    ["Indonesia", "IDN"],
    ["Mexico", "MEX"],
    ["South Africa", "ZAF"],
    ["Kenya", "KEN"],
    ["Morocco", "MAR"],
    ["Brazil", "BRA"],
    ["Croatia", "HRV"],
    ["Bahamas", "BHS"],
    ["Côte d'Ivoire", "CIV"],
    ["Curacao", "CUW"],
    ["Türkiye", "TUR"],
  ])("converts %p to %s", (country, code) => {
    expect(toCountryAlpha3(country)).toBe(code);
  });

  test.each([[undefined], [""], ["Atlantis"]])("throws for %p", (country) => {
    expect(() => toCountryAlpha3(country)).toThrow("Unsupported country");
  });
});

describe("mapCreateResponse", () => {
  test.each([
    ["Approved", "PASSED"],
    ["Flagged", "FLAGGED"],
    ["Rejected", "FAILED"],
  ])("maps Truvi status %s to %s", (truviStatus, domitsStatus) => {
    const result = mapCreateResponse({ verification: { verificationId: "v-1", status: truviStatus } });
    expect(result).toEqual({ providerAssessmentId: "v-1", status: domitsStatus, flaggedReason: null });
  });

  test("returns ERROR with the unknown status in the message", () => {
    const result = mapCreateResponse({ verification: { verificationId: "v-1", status: "Pending" } });
    expect(result).toEqual({
      providerAssessmentId: "v-1",
      status: "ERROR",
      flaggedReason: null,
      error: { status: null, message: "Unknown Truvi status: Pending" },
    });
  });

  test.each([[{}], [null], [undefined]])("returns ERROR instead of throwing for a response without verification: %p", (response) => {
    expect(mapCreateResponse(response)).toEqual({
      providerAssessmentId: null,
      status: "ERROR",
      flaggedReason: null,
      error: { status: null, message: "Truvi response has no verification" },
    });
  });

  test("keeps the flagged reason", () => {
    const result = mapCreateResponse({ verification: { verificationId: "v-1", status: "Flagged", flaggedReason: "Invalid Email" } });
    expect(result.flaggedReason).toBe("Invalid Email");
  });
});