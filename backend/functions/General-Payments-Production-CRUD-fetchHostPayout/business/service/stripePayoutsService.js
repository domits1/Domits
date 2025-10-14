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

    const connectedAccount = "acct_1QxTbi2eKtSPvnOL"; // testing account

    const charges = await this.stripe.charges.list({ stripeAccount: connectedAccount });

    const chargeDetails = await Promise.all(
      charges.data.map(async (charge) => {
        const balanceTx = await this.stripe.balanceTransactions.retrieve(charge.balance_transaction, {
          stripeAccount: connectedAccount,
        });

        const appFee = await this.stripe.applicationFees.retrieve(charge.application_fee);

        const charges = await this.stripe.charges.retrieve(appFee.originating_transaction);

        return {
          id: charge.id,
          bruto: balanceTx.amount / 100,
          stripe_fees: balanceTx.fee / 100,
          netto: balanceTx.net / 100,
          currency: balanceTx.currency.toUpperCase(),
          status: charge.status,
          createdDate: new Date(charge.created * 1000).toLocaleDateString(),
          customer: charge.customer,
          application_fee: appFee.amount / 100,
          customer_name: charges.billing_details.name,
        };
      })
    );

    return {
      statusCode: 200,
      message: "Charges fetched successfully",
      details: {
        charges: chargeDetails,
      },
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
