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

    const account_Id = await this.stripeRepository.getStripeAccountId(hostId);

    const paymentData = await this.stripeRepository.createPaymentIntent(
      account_Id,
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

    return {
      stripeClientSecret: paymentData.stripeClientSecret,
      bookingId: bookingId,
    };
  }
}
export default PaymentService;
