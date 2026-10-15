import { describe, expect, it, jest } from "@jest/globals";
import { TruviBookingScreener } from "../../functions/Truvi-Integration/business/truviBookingScreener.js";

const candidate = (overrides = {}) => ({
  booking: {
    id: "booking-1",
    arrivaldate: Date.UTC(2026, 11, 1),
    departuredate: Date.UTC(2026, 11, 5),
    createdat: Date.UTC(2026, 9, 6),
    guestname: "John Doe",
    guest_email: null,
  },
  property: { id: "property-1", title: "Villa Zon" },
  location: { street: "Kinderhuissingel", housenumber: 6, housenumberextension: "k", city: "Haarlem", country: "Netherlands", postalcode: "2013AS" },
  rules: [],
  guestId: "guest-1",
  hostId: "host-1",
  hostName: "Host BV",
  bookingSource: null,
  ...overrides,
});

const build = ({ candidates = [candidate()], screen, guestEmail = "john@example.com", host = { name: "Host BV", email: "host@example.com" } } = {}) => {
  const bookingRepository = { listBookingsToScreen: jest.fn(async () => candidates) };
  const screeningService = {
    screenBooking: jest.fn(screen || (async () => ({ providerAssessmentId: "v-1", status: "PASSED", flaggedReason: null }))),
  };
  const assessmentRepository = { saveResult: jest.fn(async () => ({})) };
  const contactLookup = { getGuestEmail: jest.fn(async () => guestEmail), getHost: jest.fn(async () => host) };
  const screener = new TruviBookingScreener({
    bookingRepository,
    screeningService,
    assessmentRepository,
    contactLookup,
    extendedAmount: 1000,
  });
  return { screener, bookingRepository, screeningService, assessmentRepository, contactLookup };
};

describe("TruviBookingScreener", () => {
  it("refuses to start without an extendedAmount", () => {
    expect(() => new TruviBookingScreener({})).toThrow("extendedAmount is required");
  });

  it("screens a booking with the guest email and host from the lookup and saves the result", async () => {
    const { screener, bookingRepository, screeningService, assessmentRepository, contactLookup } = build();

    const summary = await screener.run({ limit: 5, now: 1000 });

    expect(bookingRepository.listBookingsToScreen).toHaveBeenCalledWith({ now: 1000, limit: 5 });
    expect(contactLookup.getGuestEmail).toHaveBeenCalledWith("guest-1");
    expect(contactLookup.getHost).toHaveBeenCalledWith("host-1");
    const input = screeningService.screenBooking.mock.calls[0][0];
    expect(input.booking.guest_email).toBe("john@example.com");
    expect(input.host).toEqual({ name: "Host BV", email: "host@example.com" });
    expect(input.protection).toEqual({ extendedAmount: 1000 });
    expect(input.channel).toBe("Direct web");
    expect(assessmentRepository.saveResult).toHaveBeenCalledWith({
      bookingId: "booking-1",
      result: { providerAssessmentId: "v-1", status: "PASSED", flaggedReason: null },
      now: 1000,
    });
    expect(summary).toEqual({ listed: 1, saved: 1, retryLater: 0, rejected: 0, errors: [] });
  });

  it("keeps the email from the booking and uses the booking source as channel", async () => {
    const withEmail = candidate({ bookingSource: "Airbnb" });
    withEmail.booking.guest_email = "guest@example.com";
    const { screener, screeningService, contactLookup } = build({ candidates: [withEmail] });

    await screener.run({ now: 1000 });

    expect(contactLookup.getGuestEmail).not.toHaveBeenCalled();
    expect(screeningService.screenBooking.mock.calls[0][0].booking.guest_email).toBe("guest@example.com");
    expect(screeningService.screenBooking.mock.calls[0][0].channel).toBe("Airbnb");
  });

  it("does not save when Truvi is down, so the next run tries again", async () => {
    const { screener, assessmentRepository } = build({
      screen: async () => ({ providerAssessmentId: null, status: "ERROR", flaggedReason: null, error: { status: 503, message: "down" } }),
    });

    const summary = await screener.run({ now: 1000 });

    expect(assessmentRepository.saveResult).not.toHaveBeenCalled();
    expect(summary.retryLater).toBe(1);
  });

  it("does not save after a timeout, which has no status", async () => {
    const { screener, assessmentRepository } = build({
      screen: async () => ({ providerAssessmentId: null, status: "ERROR", flaggedReason: null, error: { status: null, message: "timeout" } }),
    });

    const summary = await screener.run({ now: 1000 });

    expect(assessmentRepository.saveResult).not.toHaveBeenCalled();
    expect(summary.retryLater).toBe(1);
  });

  it("saves an ERROR when Truvi rejects the request, so it is not sent again every run", async () => {
    const { screener, assessmentRepository } = build({
      screen: async () => ({ providerAssessmentId: null, status: "ERROR", flaggedReason: null, error: { status: 400, message: "bad" } }),
    });

    const summary = await screener.run({ now: 1000 });

    expect(assessmentRepository.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({ result: expect.objectContaining({ status: "ERROR" }) })
    );
    expect(summary.saved).toBe(1);
  });

  it("saves an ERROR without calling Truvi when the booking data is not usable", async () => {
    const { screener, screeningService, assessmentRepository } = build({ candidates: [candidate({ location: null })] });

    const summary = await screener.run({ now: 1000 });

    expect(screeningService.screenBooking).not.toHaveBeenCalled();
    const saved = assessmentRepository.saveResult.mock.calls[0][0].result;
    expect(saved.status).toBe("ERROR");
    expect(saved.error.message).toBe("Property has no location");
    expect(summary).toEqual({ listed: 1, saved: 1, retryLater: 0, rejected: 1, errors: [] });
  });

  it("saves an ERROR when the mapper refuses the booking", async () => {
    const { screener, assessmentRepository } = build({
      screen: async () => {
        throw new Error("Guest needs a first and a last name");
      },
    });

    const summary = await screener.run({ now: 1000 });

    expect(assessmentRepository.saveResult.mock.calls[0][0].result.error.message).toBe("Guest needs a first and a last name");
    expect(summary.rejected).toBe(1);
  });

  it("saves an ERROR when the host has no email", async () => {
    const { screener, screeningService, assessmentRepository } = build({ host: null });

    await screener.run({ now: 1000 });

    expect(screeningService.screenBooking).not.toHaveBeenCalled();
    expect(assessmentRepository.saveResult.mock.calls[0][0].result.error.message).toBe("Host has no email");
  });

  it("keeps going with the next booking when one fails to save", async () => {
    const second = candidate();
    second.booking = { ...second.booking, id: "booking-2" };
    const { screener, assessmentRepository } = build({ candidates: [candidate(), second] });
    assessmentRepository.saveResult.mockRejectedValueOnce(new Error("database down"));

    const summary = await screener.run({ now: 1000 });

    expect(assessmentRepository.saveResult).toHaveBeenCalledTimes(2);
    expect(summary.saved).toBe(1);
    expect(summary.errors).toEqual([{ bookingId: "booking-1", message: "database down" }]);
  });
});