import {
  BOOKING_REQUEST_ERROR_SCOPES,
  BOOKING_REQUEST_RECOVERY,
  resolveBookingRequestErrorPresentation,
} from "../rendering/booking/bookingRequestErrorCopy";
import { BOOKING_GUEST_EMAIL_PATTERN, validateBookingGuestContact } from "../rendering/booking/bookingRequestContact";

const buildError = (code, overrides = {}) => ({
  code,
  message: "Server says so.",
  status: 400,
  requestId: "req-1",
  ...overrides,
});

describe("resolveBookingRequestErrorPresentation", () => {
  it("puts a rejected guest contact on the form with the server message", () => {
    const presentation = resolveBookingRequestErrorPresentation(buildError("invalid_guest_contact"));
    expect(presentation.scope).toBe(BOOKING_REQUEST_ERROR_SCOPES.CONTACT);
    expect(presentation.message).toBe("Server says so.");
    expect(presentation.recovery).toBe(BOOKING_REQUEST_RECOVERY.NONE);
  });

  it.each(["site_not_found", "site_not_published", "site_suspended"])(
    "hides the whole action for a site lifecycle problem (%s)",
    (code) => {
      const presentation = resolveBookingRequestErrorPresentation(buildError(code));
      expect(presentation.scope).toBe(BOOKING_REQUEST_ERROR_SCOPES.PANEL);
      expect(presentation.hideAction).toBe(true);
      expect(presentation.message).toMatch(/isn't available/i);
    }
  );

  it.each(["quote_expired", "unavailable_dates", "network_error", "rate_limited", "internal_error", "something_new"])(
    "offers a retry with the same key and the reference for everything else (%s)",
    (code) => {
      const presentation = resolveBookingRequestErrorPresentation(buildError(code));
      expect(presentation.scope).toBe(BOOKING_REQUEST_ERROR_SCOPES.PANEL);
      expect(presentation.recovery).toBe(BOOKING_REQUEST_RECOVERY.RETRY);
      expect(presentation.showReference).toBe(true);
      expect(presentation.message).toMatch(/couldn't send your request/i);
    }
  );

  it("does not show a reference when the error carries none", () => {
    expect(resolveBookingRequestErrorPresentation(buildError("internal_error", { requestId: "" })).showReference).toBe(
      false
    );
  });

  it("survives a missing error object", () => {
    const presentation = resolveBookingRequestErrorPresentation(null);
    expect(presentation.scope).toBe(BOOKING_REQUEST_ERROR_SCOPES.PANEL);
    expect(presentation.recovery).toBe(BOOKING_REQUEST_RECOVERY.RETRY);
  });
});

describe("validateBookingGuestContact", () => {
  it("accepts a name and a plausible email, trimmed", () => {
    expect(validateBookingGuestContact({ name: "  Guest Name ", email: " Guest@Example.com " })).toEqual({
      guest: { name: "Guest Name", email: "guest@example.com" },
      errors: {},
    });
  });

  it.each([
    ["missing name", { name: "", email: "guest@example.com" }, "name"],
    ["missing email", { name: "Guest", email: "" }, "email"],
    ["malformed email", { name: "Guest", email: "not-an-email" }, "email"],
    ["email with spaces", { name: "Guest", email: "guest @example.com" }, "email"],
  ])("rejects %s", (_label, guest, field) => {
    const { errors } = validateBookingGuestContact(guest);
    expect(Object.keys(errors)).toEqual([field]);
    expect(errors[field]).toEqual(expect.any(String));
  });

  it("reports both fields when both are missing", () => {
    expect(Object.keys(validateBookingGuestContact({ name: "", email: "" }).errors).sort()).toEqual(["email", "name"]);
  });

  it("rejects a pathological address in linear time", () => {
    const email = `a@${"b.".repeat(50000)} `;
    expect(BOOKING_GUEST_EMAIL_PATTERN.test(email)).toBe(false);
  });

  it("accepts subdomains and rejects consecutive or trailing dots", () => {
    expect(BOOKING_GUEST_EMAIL_PATTERN.test("guest@mail.example.co.uk")).toBe(true);
    expect(BOOKING_GUEST_EMAIL_PATTERN.test("guest@example..com")).toBe(false);
    expect(BOOKING_GUEST_EMAIL_PATTERN.test("guest@example.com.")).toBe(false);
    expect(BOOKING_GUEST_EMAIL_PATTERN.test("guest@example")).toBe(false);
  });
});
