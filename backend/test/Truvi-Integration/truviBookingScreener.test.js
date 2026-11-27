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

const build = ({
  candidates = [candidate()],
  screen,
  guestEmail = "john@example.com",
  host = { name: "Host BV", email: "host@example.com" },
  logger = { warn: jest.fn() },
} = {}) => {
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
    logger,
  });
  return { screener, bookingRepository, screeningService, assessmentRepository, contactLookup, logger };
};

describe("TruviBookingScreener", () => {
  it("still screens a booking whose dates are not at UTC midnight, but counts and logs it without guest data", async () => {
    const booking = { ...candidate().booking, arrivaldate: Date.UTC(2026, 10, 30, 23), departuredate: Date.UTC(2026, 11, 5) };
    const { screener, screeningService, logger } = build({ candidates: [candidate({ booking })] });

    const summary = await screener.run({ now: 1000 });

    expect(screeningService.screenBooking).toHaveBeenCalledTimes(1);
    expect(summary.saved).toBe(1);
    expect(summary.notUtcMidnight).toBe(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const logged = logger.warn.mock.calls[0][0];
    expect(JSON.parse(logged)).toEqual({ event: "TRUVI_DATE_NOT_UTC_MIDNIGHT", bookingId: "booking-1" });
    expect(logged).not.toMatch(/John|example\.com/);
  });

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
      arrivalDate: Date.UTC(2026, 11, 1),
      departureDate: Date.UTC(2026, 11, 5),
      now: 1000,
    });
    expect(summary).toEqual({ listed: 1, saved: 1, retryLater: 0, rejected: 0, notUtcMidnight: 0, errors: [] });
  });

  it("sends Truvi the same time as the run, so one run uses one clock", async () => {
    const { screener, screeningService } = build();

    await screener.run({ now: Date.UTC(2026, 10, 9, 10, 0, 0) });

    expect(screeningService.screenBooking.mock.calls[0][0].now).toEqual(new Date(Date.UTC(2026, 10, 9, 10, 0, 0)));
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

  it.each([401, 403, 408, 429])(
    "does not save a %p, because it is about the key, the time or the rate limit and not about this booking",
    async (status) => {
      const { screener, assessmentRepository } = build({
        screen: async () => ({ providerAssessmentId: null, status: "ERROR", flaggedReason: null, error: { status, message: "no" } }),
      });

      const summary = await screener.run({ now: 1000 });

      expect(assessmentRepository.saveResult).not.toHaveBeenCalled();
      expect(summary.retryLater).toBe(1);
    }
  );

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

  it("saves SKIPPED without calling Truvi when the booking data is not usable", async () => {
    const { screener, screeningService, assessmentRepository } = build({ candidates: [candidate({ location: null })] });

    const summary = await screener.run({ now: 1000 });

    expect(screeningService.screenBooking).not.toHaveBeenCalled();
    const saved = assessmentRepository.saveResult.mock.calls[0][0].result;
    expect(saved.status).toBe("SKIPPED");
    expect(saved.error.message).toBe("Property has no location");
    expect(summary).toEqual({ listed: 1, saved: 1, retryLater: 0, rejected: 1, notUtcMidnight: 0, errors: [] });
  });

  it("saves SKIPPED when the mapper refuses the booking", async () => {
    const { screener, assessmentRepository } = build({
      screen: async () => {
        throw new Error("Guest needs a first and a last name");
      },
    });

    const summary = await screener.run({ now: 1000 });

    expect(assessmentRepository.saveResult.mock.calls[0][0].result).toEqual(
      expect.objectContaining({ status: "SKIPPED", error: { status: null, message: "Guest needs a first and a last name" } })
    );
    expect(summary.rejected).toBe(1);
  });

  it.each([new TypeError("Cannot read properties of undefined"), new ReferenceError("x is not defined")])(
    "does not save a programming error like %p, but reports it so the run fails and the booking is tried again",
    async (bug) => {
      const { screener, assessmentRepository } = build({
        screen: async () => {
          throw bug;
        },
      });

      const summary = await screener.run({ now: 1000 });

      expect(assessmentRepository.saveResult).not.toHaveBeenCalled();
      expect(summary.errors).toEqual([{ bookingId: "booking-1", message: bug.message }]);
    }
  );

  it("saves SKIPPED when the host has no email", async () => {
    const { screener, screeningService, assessmentRepository } = build({ host: null });

    await screener.run({ now: 1000 });

    expect(screeningService.screenBooking).not.toHaveBeenCalled();
    expect(assessmentRepository.saveResult.mock.calls[0][0].result).toEqual(expect.objectContaining({ status: "SKIPPED" }));
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