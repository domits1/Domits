import { DEFAULT_CHANNEL, TruviInputError, isUtcMidnight } from "../util/truviMapper.js";
import { RETRY_STATUS } from "../data/truviBookingRepository.js";

export const MAX_SCREENING_TRIES = 5;

const sentDates = (booking, result) =>
  result.providerAssessmentId ? { arrivalDate: booking.arrivaldate, departureDate: booking.departuredate } : {};

const hasUtcMidnightDates = (booking) => isUtcMidnight(booking.arrivaldate) && isUtcMidnight(booking.departuredate);

const RETRYABLE_CLIENT_STATUSES = new Set([401, 403, 408, 429]);
const KEY_STATUSES = new Set([401, 403]);

const isRetryableError = (error) =>
  !error || error.status === null || error.status === undefined || error.status >= 500 || RETRYABLE_CLIENT_STATUSES.has(error.status);

export class TruviBookingScreener {
  constructor({ bookingRepository, screeningService, assessmentRepository, contactLookup, extendedAmount, logger = console }) {
    if (!extendedAmount) {
      throw new Error("extendedAmount is required for the Truvi screener");
    }
    this.bookingRepository = bookingRepository;
    this.screeningService = screeningService;
    this.assessmentRepository = assessmentRepository;
    this.contactLookup = contactLookup;
    this.extendedAmount = extendedAmount;
    this.logger = logger;
  }

  async run({ limit, now = Date.now() } = {}) {
    const bookings = await this.bookingRepository.listBookingsToScreen({ now, limit });
    const summary = { listed: bookings.length, saved: 0, retryLater: 0, rejected: 0, notUtcMidnight: 0, gaveUp: 0, errors: [] };

    for (const candidate of bookings) {
      const bookingId = candidate.booking.id;
      try {
        if (!hasUtcMidnightDates(candidate.booking)) {
          summary.notUtcMidnight += 1;
          this.logger.warn(JSON.stringify({ event: "TRUVI_DATE_NOT_UTC_MIDNIGHT", bookingId }));
        }
        const input = await this.#buildInput(candidate, now);
        const result = await this.#screen(input);

        if (result.status === "ERROR" && isRetryableError(result.error)) {
          await this.#tryAgainLater(candidate, result, now, summary);
          continue;
        }

        await this.assessmentRepository.saveResult({ bookingId, result, now, ...sentDates(candidate.booking, result) });
        summary.saved += 1;
        if (result.rejectedInput) {
          summary.rejected += 1;
        }
      } catch (error) {
        summary.errors.push({ bookingId, message: error.message });
      }
    }

    return summary;
  }

  async #tryAgainLater({ booking, failedAttempts }, result, now, summary) {
    if (KEY_STATUSES.has(result.error?.status)) {
      summary.retryLater += 1;
      return;
    }
    const tries = (Number(failedAttempts) || 0) + 1;
    if (tries < MAX_SCREENING_TRIES) {
      await this.assessmentRepository.saveResult({
        bookingId: booking.id,
        result: { ...result, status: RETRY_STATUS },
        failedAttempts: tries,
        now,
      });
      summary.retryLater += 1;
      return;
    }
    await this.assessmentRepository.saveResult({ bookingId: booking.id, result, now });
    summary.gaveUp += 1;
    summary.errors.push({ bookingId: booking.id, message: result.error?.message ?? "Truvi did not answer" });
  }

  async #buildInput(candidate, now) {
    const guestEmail = candidate.booking.guest_email || (await this.contactLookup.getGuestEmail(candidate.guestId));
    const host = await this.contactLookup.getHost(candidate.hostId);

    return {
      booking: { ...candidate.booking, guest_email: guestEmail || null },
      property: candidate.property,
      location: candidate.location,
      rules: candidate.rules,
      host: { name: host?.name || candidate.hostName, email: host?.email },
      protection: { extendedAmount: this.extendedAmount },
      channel: candidate.bookingSource || DEFAULT_CHANNEL,
      now: new Date(now),
    };
  }

  async #screen(input) {
    if (!input.location) {
      return this.#skipped("Property has no location");
    }
    if (!input.host.email) {
      return this.#skipped("Host has no email");
    }
    try {
      return await this.screeningService.screenBooking(input);
    } catch (error) {
      if (!(error instanceof TruviInputError)) {
        throw error;
      }
      return this.#skipped(error.message);
    }
  }

  #skipped(message) {
    return {
      providerAssessmentId: null,
      status: "SKIPPED",
      flaggedReason: null,
      error: { status: null, message: String(message).slice(0, 200) },
      rejectedInput: true,
    };
  }
}

export default TruviBookingScreener;