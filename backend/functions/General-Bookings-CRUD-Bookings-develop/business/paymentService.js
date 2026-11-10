import stripeRepository from "../data/stripeRepository.js";
import NotFoundException from "../util/exception/NotFoundException.js";
import {
  DIRECT_BOOKING_COMMISSION_PERIOD_MS,
  resolveDirectBookingCommission,
} from "../util/directBookingCommission.js";

const BOOKING_SOURCE_STANDALONE_SITE = "STANDALONE_SITE";

const createEnterpriseTierError = () => {
  const error = new Error(
    "Annual direct booking revenue has reached €5,000,000. A custom Enterprise commission rate must be configured before another payment can be created."
  );
  error.statusCode = 409;
  error.code = "DIRECT_BOOKING_ENTERPRISE_TIER_REQUIRED";
  return error;
};

class PaymentService {
  constructor(repository = new stripeRepository(), clock = Date.now) {
    this.stripeRepository = repository;
    this.clock = clock;
  }

  async prepareCommission(hostId, bookingId) {
    const booking = await this.stripeRepository.getBookingForPayment(bookingId);
    if (!booking) {
      throw new NotFoundException("Booking not found.");
    }
    if (booking.hostid !== hostId) {
      const error = new Error("Only the booking's host may create its payment.");
      error.statusCode = 403;
      throw error;
    }
    if (booking.booking_source !== BOOKING_SOURCE_STANDALONE_SITE) {
      return null;
    }

    const customerPaysCents = Math.round(Number(booking.total_price) * 100);
    const commissionableAmountCents = Number(booking.commissionable_amount_cents);
    if (
      !Number.isSafeInteger(customerPaysCents) ||
      customerPaysCents <= 0 ||
      !Number.isSafeInteger(commissionableAmountCents) ||
      commissionableAmountCents <= 0 ||
      commissionableAmountCents > customerPaysCents
    ) {
      const error = new Error("The standalone-site booking is missing a valid commissionable price.");
      error.statusCode = 409;
      throw error;
    }

    const periodEnd = this.clock();
    const periodStart = periodEnd - DIRECT_BOOKING_COMMISSION_PERIOD_MS;
    const previousAnnualRevenueCents =
      await this.stripeRepository.getAnnualDirectBookingRevenueCents(hostId, periodStart, periodEnd);
    const commission = resolveDirectBookingCommission({
      previousAnnualRevenueCents,
      commissionableAmountCents,
    });

    if (commission.tier.enterprise) {
      throw createEnterpriseTierError();
    }

    return {
      customerPaysCents,
      commissionableAmountCents,
      commissionRateBps: commission.tier.rateBps,
      commissionAmountCents: commission.commissionAmountCents,
      annualRevenueCents: commission.annualRevenueCents,
      periodStart,
      periodEnd,
    };
  }

  async create(hostId, bookingId, propertyId, dates, preparedCommissionSnapshot = undefined) {
    if (!hostId || !bookingId || !propertyId || !dates) {
      throw new NotFoundException("Missing required parameters: hostId, bookingId, propertyId, or dates.");
    }

    const commissionSnapshot = preparedCommissionSnapshot === undefined
      ? await this.prepareCommission(hostId, bookingId)
      : preparedCommissionSnapshot;

    const account_Id = await this.stripeRepository.getStripeAccountId(hostId);
    const paymentData = await this.stripeRepository.createPaymentIntent(
      account_Id,
      propertyId,
      dates,
      bookingId,
      commissionSnapshot
    );

    const totalCents = paymentData?.breakdown?.customerPays ?? null;
    await this.stripeRepository.updatePaymentId(
      bookingId,
      paymentData.stripePaymentId,
      totalCents,
      commissionSnapshot
    );

    await this.stripeRepository.addPaymentToTable(paymentData);

    return {
      stripeClientSecret: paymentData.stripeClientSecret,
      bookingId,
    };
  }
}
export default PaymentService;
