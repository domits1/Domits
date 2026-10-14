import { describe, expect, it } from "@jest/globals";
import {
  PUBLIC_BOOKING_REQUEST_ERROR_CODES,
  PublicBookingRequestError,
  publicBookingRequestErrorFromQuoteError,
} from "../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/PublicBookingRequestError.js";

describe("PublicBookingRequestError", () => {
  it.each([
    ["invalid_request", 400],
    ["missing_idempotency_key", 400],
    ["invalid_idempotency_key", 400],
    ["invalid_guest_contact", 400],
    ["invalid_guest_count", 400],
    ["invalid_date_range", 400],
    ["quote_token_invalid", 401],
    ["site_not_found", 404],
    ["site_not_published", 409],
    ["unavailable_dates", 409],
    ["stay_restriction_violation", 409],
    ["quote_expired", 409],
    ["site_suspended", 410],
    ["quote_unavailable", 422],
    ["idempotency_key_reused", 422],
    ["pricing_service_unavailable", 503],
    ["booking_service_unavailable", 503],
    ["internal_error", 500],
  ])("maps %s to HTTP %i", (code, statusCode) => {
    const error = new PublicBookingRequestError(code, "message");
    expect(error.code).toBe(code);
    expect(error.statusCode).toBe(statusCode);
    expect(error.name).toBe("PublicBookingRequestError");
    expect(Object.values(PUBLIC_BOOKING_REQUEST_ERROR_CODES)).toContain(code);
  });

  it("refuses unknown codes so the mapping stays exhaustive", () => {
    expect(() => new PublicBookingRequestError("made_up", "nope")).toThrow(TypeError);
  });
});

describe("publicBookingRequestErrorFromQuoteError", () => {
  it("passes known quote endpoint codes through with the server message", () => {
    const error = publicBookingRequestErrorFromQuoteError({ code: "stay_restriction_violation", message: "Min 3 nights." });
    expect(error.code).toBe("stay_restriction_violation");
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe("Min 3 nights.");
  });

  it("maps an unknown or missing quote code to booking_service_unavailable", () => {
    expect(publicBookingRequestErrorFromQuoteError({ code: "something_new", message: "" }).code).toBe(
      "booking_service_unavailable"
    );
    expect(publicBookingRequestErrorFromQuoteError(null).code).toBe("booking_service_unavailable");
  });
});
