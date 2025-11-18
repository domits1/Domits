import { Repository } from "../../data/repository.js";
import StripeAccountRepository from "../../../General-Payments-Production-CRUD-fetchHostPayout/data/stripeAccountRepository.js";
import AuthManager from "../../auth/authManager.js";
import Stripe from "stripe";

export class PaymentsService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.repository = new Repository();
    this.stripeAccountRepository = new StripeAccountRepository();
    this.authManager = new AuthManager();
  }

  async getTotalHostRevenue(event) {
    const token = event.headers.Authorization;
    if (!token) throw new Error("Authorization token is missing");

    const { sub: cognitoUserId } = await this.authManager.authenticateUser(token);
    if (!cognitoUserId) throw new Error("User ID is missing");

    const stripeAccount = await this.stripeAccountRepository.getExistingStripeAccount(cognitoUserId);
    if (!stripeAccount?.account_id) {
      throw new Error("No Stripe account found for this user.");
    }

    const transfers = await this.stripe.transfers.list({
      destination: stripeAccount.account_id,
      limit: 100,
      expand: [
        "data.source_transaction",
        "data.source_transaction.balance_transaction",
        "data.source_transaction.application_fee",
        "data.source_transaction.payment_intent",
      ],
    });

    let totalRevenue = 0;

    for (const tr of transfers.data) {
      const charge = tr.source_transaction;
      const appFee = charge.application_fee;
      const customerPaid = charge.amount;
      const platformFeeGross = appFee.amount;
      const hostReceives = customerPaid - platformFeeGross;
      totalRevenue += hostReceives;
    }
    return {
      totalRevenue: (totalRevenue / 100).toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    };
  }
}
