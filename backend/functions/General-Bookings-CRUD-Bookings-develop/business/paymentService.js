import stripeRepository from "../data/stripeRepository.js";
import NotFoundException from "../util/exception/NotFoundException.js";

class PaymentService {
  constructor({ stripeRepository: repository = new stripeRepository() } = {}) {
    this.stripeRepository = repository;
  }

  async create(hostId, bookingId, propertyId, dates, commission = null) {
    if (!hostId || !bookingId || !propertyId || !dates) {
      throw new NotFoundException("Missing required parameters: hostId, bookingId, propertyId, or dates.");
    }

    const accountId = await this.stripeRepository.getStripeAccountId(hostId);
    let paymentData;

    try {
      paymentData = await this.stripeRepository.createPaymentIntent(
        accountId,
        propertyId,
        dates,
        bookingId,
        hostId,
        commission
      );

      const totalCents = paymentData?.breakdown?.customerPays ?? null;
      await this.stripeRepository.updatePaymentId(
        bookingId,
        paymentData.stripePaymentId,
        totalCents,
        paymentData.commission || null
      );

      await this.stripeRepository.addPaymentToTable(paymentData);
    } catch (error) {
      if (paymentData?.stripePaymentId) {
        try {
          await this.cancel(paymentData.stripePaymentId, bookingId);
        } catch (cleanupError) {
          console.error("Failed to clean up an incomplete Stripe payment setup:", cleanupError);
        }
      }
      throw error;
    }

    return {
      stripeClientSecret: paymentData.stripeClientSecret,
      stripePaymentId: paymentData.stripePaymentId,
      bookingId,
    };
  }

  async cancel(paymentId, bookingId) {
    if (!paymentId || !bookingId) {
      throw new NotFoundException("Missing paymentId or bookingId for payment cleanup.");
    }

    let cleanupError = null;
    try {
      await this.stripeRepository.cancelPaymentIntent(paymentId);
    } catch (error) {
      cleanupError = error;
    }

    try {
      await this.stripeRepository.clearPaymentId(bookingId, paymentId);
    } catch (error) {
      cleanupError ||= error;
    }

    if (cleanupError) throw cleanupError;
  }
}

export default PaymentService;
