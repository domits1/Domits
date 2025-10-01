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

    const connectedAccount = "acct_1QxTbi2eKtSPvnOL";

    const charges = await this.stripe.charges.list({ limit: 10 }, { stripeAccount: connectedAccount });

    const chargeDetails = await Promise.all(
      charges.data.map(async (charge) => {
        const balanceTx = await this.stripe.balanceTransactions.retrieve(charge.balance_transaction, {
          stripeAccount: connectedAccount,
        });

        console.log("charge", charge);
        console.log("balanceTx", balanceTx);

        const appFee = await this.stripe.applicationFees.retrieve(charge.application_fee);

        console.log("appFee", appFee);

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
}
