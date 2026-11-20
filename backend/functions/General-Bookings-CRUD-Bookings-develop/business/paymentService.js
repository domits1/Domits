import StripeRepository from "../data/stripeRepository.js";
import NotFoundException from "../util/exception/NotFoundException.js";

const isReadablePaymentId = (paymentId) =>
  typeof paymentId === "string" && paymentId.trim() && !paymentId.trim().startsWith("FAILED");

class PaymentService {
  constructor({ stripeRepository = new StripeRepository() } = {}) {
    this.stripeRepository = stripeRepository;
  }

  async create(hostId, bookingId, propertyId, dates, existingPaymentId = null) {
    if (!hostId || !bookingId || !propertyId || !dates) {
      throw new NotFoundException("Missing required parameters: hostId, bookingId, propertyId, or dates.");
    }

    if (isReadablePaymentId(existingPaymentId)) {
      const existingIntent = await this.stripeRepository.getPaymentIntentByPaymentId(existingPaymentId);
      if (!existingIntent?.client_secret) {
        throw new Error("The existing payment could not be recovered.");
      }

      const paymentData = {
        stripePaymentId: existingIntent.id || existingPaymentId,
        stripeClientSecret: existingIntent.client_secret,
      };
      await this.stripeRepository.addPaymentToTable(paymentData);
      return {
        stripeClientSecret: paymentData.stripeClientSecret,
        bookingId,
      };
    }

    const accountId = await this.stripeRepository.getStripeAccountId(hostId);
    const paymentData = await this.stripeRepository.createPaymentIntent(accountId, propertyId, dates, bookingId);

    await this.stripeRepository.addPaymentToTable(paymentData);

    const totalCents = paymentData?.breakdown?.customerPays ?? null;
    await this.stripeRepository.updatePaymentId(bookingId, paymentData.stripePaymentId, totalCents);

    return {
      stripeClientSecret: paymentData.stripeClientSecret,
      bookingId,
    };
  }
}

export default PaymentService;
