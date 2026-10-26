import { jest } from "@jest/globals";
import { TruviScreeningService, isEchoTokenReuse } from "../../functions/Truvi-Integration/business/truviScreeningService.js";
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
  location: { street: "Kinderhuissingel", housenumber: 6, city: "Haarlem", country: "Netherlands", postalcode: "2013AS" },
  host: { name: "Host BV", email: "host@example.com" },
  protection: { extendedAmount: 1000 },
});

const tokenUsed = (verificationId = "v-1") =>
  new TruviApiError(400, "echoToken (abc) already exists from a previous request", { verificationId });

describe("isEchoTokenReuse", () => {
  test("is true for the 400 that names the earlier verification", () => {
    expect(isEchoTokenReuse(tokenUsed())).toBe(true);
  });

  test("is false for another 400", () => {
    expect(isEchoTokenReuse(new TruviApiError(400, "checkIn must not be in the past."))).toBe(false);
  });

  test("is false when Truvi did not send a verificationId", () => {
    expect(isEchoTokenReuse(tokenUsed(null))).toBe(false);
  });

  test("is false for a network error", () => {
    expect(isEchoTokenReuse(new TypeError("fetch failed"))).toBe(false);
  });
});

describe("TruviScreeningService retry of a create that already went through", () => {
  test("reads the earlier verification and returns its result", async () => {
    const apiClient = {
      createVerification: jest.fn(async () => {
        throw tokenUsed("v-1");
      }),
      getVerification: jest.fn(async () => ({ verification: { verificationId: "v-1", status: "Flagged", flaggedReason: "Invalid phone" } })),
    };
    const service = new TruviScreeningService({ apiClient });

    const result = await service.screenBooking(input());

    expect(apiClient.getVerification).toHaveBeenCalledWith("v-1");
    expect(result).toEqual({ providerAssessmentId: "v-1", status: "FLAGGED", flaggedReason: "Invalid phone" });
  });

  test("keeps the verificationId when the retrieve answer has none", async () => {
    const apiClient = {
      createVerification: jest.fn(async () => {
        throw tokenUsed("v-1");
      }),
      getVerification: jest.fn(async () => ({ verification: { status: "Approved" } })),
    };
    const service = new TruviScreeningService({ apiClient });

    const result = await service.screenBooking(input());

    expect(result).toEqual({ providerAssessmentId: "v-1", status: "PASSED", flaggedReason: null });
  });

  test("returns ERROR with the verificationId and the retrieve status when the retrieve fails", async () => {
    const apiClient = {
      createVerification: jest.fn(async () => {
        throw tokenUsed("v-1");
      }),
      getVerification: jest.fn(async () => {
        throw new TruviApiError(503, "Service Unavailable");
      }),
    };
    const service = new TruviScreeningService({ apiClient });

    const result = await service.screenBooking(input());

    expect(result).toEqual({
      providerAssessmentId: "v-1",
      status: "ERROR",
      flaggedReason: null,
      error: { status: 503, message: "Service Unavailable" },
    });
  });

  test("does not retrieve anything for another 400", async () => {
    const apiClient = {
      createVerification: jest.fn(async () => {
        throw new TruviApiError(400, "checkIn must not be in the past.");
      }),
      getVerification: jest.fn(),
    };
    const service = new TruviScreeningService({ apiClient });

    const result = await service.screenBooking(input());

    expect(apiClient.getVerification).not.toHaveBeenCalled();
    expect(result.error).toEqual({ status: 400, message: "checkIn must not be in the past." });
  });

  test("sends the same echo token on two runs for the same booking", async () => {
    const apiClient = {
      createVerification: jest.fn(async () => ({ verification: { verificationId: "v-1", status: "Approved" } })),
    };
    const service = new TruviScreeningService({ apiClient });

    await service.screenBooking(input());
    await service.screenBooking(input());

    const [first, second] = apiClient.createVerification.mock.calls.map(([request]) => request.metadata.echoToken);
    expect(second).toBe(first);
  });
});
