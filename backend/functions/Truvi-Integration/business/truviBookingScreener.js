import { DEFAULT_CHANNEL } from "../util/truviMapper.js";

const isRetryableError = (error) => !error || error.status === null || error.status === undefined || error.status >= 500;

export class TruviBookingScreener {
  constructor({ bookingRepository, screeningService, assessmentRepository, contactLookup, extendedAmount }) {
    if (!extendedAmount) {
      throw new Error("extendedAmount is required for the Truvi screener");
    }
    this.bookingRepository = bookingRepository;
    this.screeningService = screeningService;
    this.assessmentRepository = assessmentRepository;
    this.contactLookup = contactLookup;
    this.extendedAmount = extendedAmount;
  }

  async run({ limit, now = Date.now() } = {}) {
    const bookings = await this.bookingRepository.listBookingsToScreen({ now, limit });
    const summary = { listed: bookings.length, saved: 0, retryLater: 0, rejected: 0, errors: [] };

    for (const candidate of bookings) {
      const bookingId = candidate.booking.id;
      try {
        const input = await this.#buildInput(candidate);
        const result = await this.#screen(input);

        if (result.status === "ERROR" && isRetryableError(result.error)) {
          summary.retryLater += 1;
          continue;
        }

        await this.assessmentRepository.saveResult({ bookingId, result, now });
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

  async #buildInput(candidate) {
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
      now: new Date(),
    };
  }

  async #screen(input) {
    if (!input.location) {
      return this.#rejected("Property has no location");
    }
    if (!input.host.email) {
      return this.#rejected("Host has no email");
    }
    try {
      return await this.screeningService.screenBooking(input);
    } catch (error) {
      return this.#rejected(error.message);
    }
  }

  #rejected(message) {
    return {
      providerAssessmentId: null,
      status: "ERROR",
      flaggedReason: null,
      error: { status: 400, message: String(message).slice(0, 200) },
      rejectedInput: true,
    };
  }
}

export default TruviBookingScreener;