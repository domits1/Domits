import stripeRepository from "../data/stripeRepository.js";
import NotFoundException from "../util/exception/NotFoundException.js";
import Stripe from "stripe";
import AuthManager from "../auth/authManager.js";

class PaymentService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.stripeRepository = new stripeRepository();
    this.authManager = new AuthManager();
  }

  async create(event, hostId, bookingId, propertyId, dates) {
    if (!hostId || !bookingId || !propertyId || !dates) {
      throw new NotFoundException("Missing required parameters: hostId, bookingId, propertyId, or dates.");
    }

    const token = event.event.Authorization;
    const { sub: cognitoUserId } = await this.authManager.authenticateUser(token);

    const account_Id = await this.stripeRepository.getStripeAccountId(hostId);

    const stripeAccount = await this.stripeRepository.getExistingStripeAccount(cognitoUserId);

    const payer = await this.stripe.accounts.retrieve(stripeAccount.account_id);

    let region = null;
    if (payer.country === "NL") {
      region = "EER";
    } else {
      region = "Non-EER";
    }

    const paymentData = await this.stripeRepository.createPaymentIntent(account_Id, propertyId, dates, region);

    await this.stripeRepository.updatePaymentId(bookingId, paymentData.stripePaymentId);

    await this.stripeRepository.addPaymentToTable(paymentData);

    return {
      stripeClientSecret: paymentData.stripeClientSecret,
      bookingId: bookingId,
    };
  }
}
export default PaymentService;
