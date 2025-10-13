import Stripe from "stripe";

import StripeAccountRepository from "../../data/stripeAccountRepository.js";
import AuthManager from "../../auth/authManager.js";

import { BadRequestException } from "../../util/exception/badRequestException.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";

const getAuth = (event) => event.headers.Authorization;

export default class StripePayoutsService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.authManager = new AuthManager();
    this.stripeAccountRepository = new StripeAccountRepository();
  }

  async getHostCharges(event) {
    const token = getAuth(event);
    const { sub: cognitoUserId } = await this.authManager.authenticateUser(token);
    if (!cognitoUserId) {
      throw new BadRequestException("Missing required fields: cognitoUserId");
    }

    const stripeAccount = await this.stripeAccountRepository.getExistingStripeAccount(cognitoUserId);

    if (!stripeAccount?.account_id) {
      throw new NotFoundException("No Stripe account found for this user.");
    }
    
    const connectedAccount = "acct_1QxTbi2eKtSPvnOL";

    const transfers = await this.stripe.transfers.list({
      destination: connectedAccount,
      expand: [
        "data.source_transaction",
        "data.source_transaction.balance_transaction",
        "data.source_transaction.application_fee",
      ],
    });

    const toAmount = (cents) => cents / 100;

    const chargeDetails = transfers.data.map((tr) => {
      const charge = tr.source_transaction;
      const bt = charge.balance_transaction;
      const appFee = charge.application_fee;

      const customerPaid = charge.amount;
      const stripeProcessingFees = bt.fee;
      const platformFeeGross = appFee.amount;
      const platformFeeNet = platformFeeGross - stripeProcessingFees;
      const hostReceives = customerPaid - platformFeeGross;

      return {
        customerPaid: toAmount(customerPaid),
        stripeProcessingFees: toAmount(stripeProcessingFees),
        platformFeeGross: toAmount(platformFeeGross),
        platformFeeNet: toAmount(platformFeeNet),
        hostReceives: toAmount(hostReceives),
        currency: (bt.currency).toUpperCase(),
        status: charge.status,
        createdDate: new Date((charge.created) * 1000).toLocaleDateString(),
        customerName: charge.billing_details.name,
        paymentMethod: charge.payment_method_details.type,
      };
    });

    return {
      statusCode: 200,
      message: "Charges fetched successfully",
      details: { charges: chargeDetails },
    };
  }

  async getHostPayouts(event) {
    const token = getAuth(event);
    const { sub: cognitoUserId } = await this.authManager.authenticateUser(token);

    if (!cognitoUserId) {
      throw new BadRequestException("Missing required fields: cognitoUserId");
    }

    const stripeAccount = await this.stripeAccountRepository.getExistingStripeAccount(cognitoUserId);

    if (!stripeAccount?.account_id) {
      throw new NotFoundException("No Stripe account found for this user.");
    }

    const connectedAccount = "acct_1OAG6OGiInrsWMEc"; // testing account

    const payouts = await this.stripe.payouts.list({ stripeAccount: connectedAccount });

    const payoutDetails = payouts.data.map((payout) => ({
      id: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency.toUpperCase(),
      arrivalDate: new Date(payout.arrival_date * 1000).toLocaleDateString(),
      status: payout.status,
      method: payout.method,
    }));

    return {
      statusCode: 200,
      message: "Payouts fetched successfully",
      details: {
        payouts: payoutDetails,
      },
    };
  }
}
