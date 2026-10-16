import { jest } from "@jest/globals";
import { TruviScreeningService } from "../../functions/Truvi-Integration/business/truviScreeningService.js";
import { TruviApiError } from "../../functions/Truvi-Integration/data/truviApiClient.js";

const input = () => ({
  booking: {
    id: "booking-1",
    arrivaldate: Date.UTC(2026, 11, 1),
    departuredate: Date.UTC(2026, 11, 5),
    createdat: Date.UTC(2026, 9, 6),
    guestname: "John Doe",
    guest_email: "john@example.com",
  },
  property: { id: "property-1", title: "Villa Zon" },
  rules: [{ property_id: "property-1", rule: "PetsAllowed", value: false }],
  location: { street: "Kinderhuissingel", housenumber: 6, city: "Haarlem", country: "Netherlands", postalcode: "2013AS" },
  host: { name: "Host BV", email: "host@example.com" },
  protection: { extendedAmount: 1000 },
});

function fakeClient(createVerification) {
  return { createVerification: jest.fn(createVerification) };
}

describe("TruviScreeningService.screenBooking", () => {
  test("sends the mapped booking to Truvi and returns PASSED for an approved guest", async () => {
    const apiClient = fakeClient(async () => ({ verification: { verificationId: "v-1", status: "Approved" } }));
    const service = new TruviScreeningService({ apiClient });

    const result = await service.screenBooking(input());

    const sentRequest = apiClient.createVerification.mock.calls[0][0];
    expect(sentRequest.reservation.reservationId).toBe("booking-1");
    expect(sentRequest.guest.email).toBe("john@example.com");
    expect(result).toEqual({ providerAssessmentId: "v-1", status: "PASSED", flaggedReason: null });
  });

  test("returns FLAGGED with the reason for a flagged guest", async () => {
    const apiClient = fakeClient(async () => ({
      verification: { verificationId: "v-2", status: "Flagged", flaggedReason: "Invalid Email" },
    }));
    const service = new TruviScreeningService({ apiClient });

    const result = await service.screenBooking(input());

    expect(result).toEqual({ providerAssessmentId: "v-2", status: "FLAGGED", flaggedReason: "Invalid Email" });
  });

  test("returns ERROR instead of throwing when Truvi answers with an error", async () => {
    const apiClient = fakeClient(async () => {
      throw new TruviApiError(400, { detail: "Check in date is in the past" });
    });
    const service = new TruviScreeningService({ apiClient });

    const result = await service.screenBooking(input());

    expect(result).toEqual({
      providerAssessmentId: null,
      status: "ERROR",
      flaggedReason: null,
      error: { status: 400, message: "Check in date is in the past" },
    });
  });

  test("returns ERROR instead of throwing when Truvi cannot be reached", async () => {
    const apiClient = fakeClient(async () => {
      throw new TypeError("fetch failed");
    });
    const service = new TruviScreeningService({ apiClient });

    const result = await service.screenBooking(input());

    expect(result.status).toBe("ERROR");
    expect(result.error).toEqual({ status: null, message: "fetch failed" });
  });

  test("throws on invalid booking data and does not call Truvi", async () => {
    const apiClient = fakeClient(async () => ({}));
    const service = new TruviScreeningService({ apiClient });
    const data = input();
    delete data.booking.guest_email;

    await expect(service.screenBooking(data)).rejects.toThrow("email or a phone");
    expect(apiClient.createVerification).not.toHaveBeenCalled();
  });
});