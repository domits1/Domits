import Stripe from "stripe";

import StripeAccountRepository from "../../data/stripeAccountRepository.js";
import PropertyRepository from "../../data/propertyRepository.js";
import AuthManager from "../../auth/authManager.js";

import { BadRequestException } from "../../util/exception/badRequestException.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";

const getAuth = (event) => event.headers.Authorization;
const toAmount = (cents) => cents / 100;

export default class StripePayoutsService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    this.authManager = new AuthManager();
    this.stripeAccountRepository = new StripeAccountRepository();
    this.propertyRepository = new PropertyRepository();
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

    const chargeDetails = await Promise.all(
      transfers.data.map(async (tr) => {
        const charge = tr.source_transaction;
        const bt = charge.balance_transaction;
        const appFee = charge.application_fee;

        const customerPaid = charge.amount;
        const stripeProcessingFees = bt.fee;
        const platformFeeGross = appFee.amount;
        const platformFeeNet = platformFeeGross - stripeProcessingFees;
        const hostReceives = customerPaid - platformFeeGross;

        const propertyId = charge.metadata.propertyId;
        const bookingId = charge.metadata.bookingId;
        const paymentId = charge.payment_intent.id;

        const property = await this.propertyRepository.getProperty(propertyId);

        return {
          customerPaid: toAmount(customerPaid),
          stripeProcessingFees: toAmount(stripeProcessingFees),
          platformFeeGross: toAmount(platformFeeGross),
          platformFeeNet: toAmount(platformFeeNet),
          hostReceives: toAmount(hostReceives),
          currency: bt.currency.toUpperCase(),
          status: charge.status,
          createdDate: new Date(charge.created * 1000).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          customerName: charge.billing_details.name,
          paymentMethod: charge.payment_method_details.type,
          propertyTitle: property.title,
          propertyImage: property.key,
          bookingId: bookingId,
          paymentId: paymentId,
        };
      })
    );

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

    const payouts = await this.stripe.payouts.list({ stripeAccount: stripeAccount.account_id });

    const payoutDetails = payouts.data.map((payout) => ({
      id: payout.id,
      amount: toAmount(payout.amount),
      currency: payout.currency.toUpperCase(),
      arrivalDate: new Date(payout.arrival_date * 1000).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
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

  async getHostBalance(event) {
    const token = getAuth(event);
    const { sub: cognitoUserId } = await this.authManager.authenticateUser(token);

    if (!cognitoUserId) {
      throw new BadRequestException("Missing required fields: cognitoUserId");
    }

    const stripeAccount = await this.stripeAccountRepository.getExistingStripeAccount(cognitoUserId);

    if (!stripeAccount?.account_id) {
      throw new NotFoundException("No Stripe account found for this user.");
    }

    const balance = await this.stripe.balance.retrieve({
      stripeAccount: stripeAccount.account_id,
    });

    const available = balance.available.map((balance) => ({
      currency: balance.currency.toUpperCase(),
      amount: toAmount(balance.amount),
    }));

    const pending = balance.pending.map((balance) => ({
      currency: balance.currency.toUpperCase(),
      amount: toAmount(balance.amount),
    }));

    return {
      statusCode: 200,
      message: "Balance fetched successfully",
      details: { available, pending },
    };
  }

  async getHostPendingAmount(event) {
    const token = getAuth(event);
    const { sub: cognitoUserId } = await this.authManager.authenticateUser(token);

    if (!cognitoUserId) {
      throw new BadRequestException("Missing required fields: cognitoUserId");
    }

    const stripeAccount = await this.stripeAccountRepository.getExistingStripeAccount(cognitoUserId);

    if (!stripeAccount?.account_id) {
      throw new NotFoundException("No Stripe account found for this user.");
    }

    const txns = await this.stripe.balanceTransactions.list(
      {
        limit: 100,
        available_on: { gte: Math.floor(Date.now() / 1000) },
      },
      { stripeAccount: stripeAccount.account_id }
    );

    const upcomingByDate = Object.values(
      txns.data
        .filter((txn) => txn.status === "pending")
        .reduce((groups, txn) => {
          const date = new Date(txn.available_on * 1000).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });

          groups[date] = groups[date] || { currency: txn.currency.toUpperCase(), amount: 0, availableOn: date, status: txn.status };
          groups[date].amount += toAmount(txn.net);

          return groups;
        }, {})
    );

    return {
      statusCode: 200,
      message: "Upcoming balance transactions fetched successfully",
      details: { upcomingByDate },
    };
  }
}
