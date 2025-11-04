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

    const txns = await this.getHostPendingAmount(event);
    const upcomingPayouts = txns.details.upcomingByDate;

    const merged = [
      ...upcomingPayouts.map((x) => ({
        arrivalDate: x.availableOn,
        amount: x.amount,
        currency: x.currency,
        status: "incoming charge - pending",
        id: null,
      })),
      ...payoutDetails,
    ];

    return {
      statusCode: 200,
      message: "Payouts fetched successfully",
      details: {
        payouts: merged,
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

          groups[date] = groups[date] || {
            currency: txn.currency.toUpperCase(),
            amount: 0,
            availableOn: date,
            availableOnTs: txn.available_on,
          };
          groups[date].amount += toAmount(txn.net);

          return groups;
        }, {})
    ).sort((a, b) => a.availableOnTs - b.availableOnTs);

    return {
      statusCode: 200,
      message: "Upcoming balance transactions fetched successfully",
      details: { upcomingByDate },
    };
  }

  async setPayoutSchedule(event) {
    const token = getAuth(event);
    const { sub: cognitoUserId } = await this.authManager.authenticateUser(token);
    if (!cognitoUserId) throw new BadRequestException("Missing required fields: cognitoUserId");

    const stripeAccount = await this.stripeAccountRepository.getExistingStripeAccount(cognitoUserId);
    if (!stripeAccount?.account_id) throw new NotFoundException("No Stripe account found for this user.");

    const body = JSON.parse(event.body || "{}");
    let { interval, weekly_anchor, monthly_anchor } = body;

    if (!interval) throw new BadRequestException("Missing required fields: interval");
    interval = interval.toLowerCase();

    const allowed = ["manual", "daily", "weekly", "monthly"];
    if (!allowed.includes(interval)) {
      throw new BadRequestException(`interval must be one of: ${allowed.join(", ")}`);
    }

    if (interval === "manual") {
      const balanceRes = await this.getHostBalance(event);
      const availableList = balanceRes.details.available;

      const totalAvailableCents = availableList.reduce((sum, { amount }) => sum + amount * 100, 0);

      if (totalAvailableCents <= 0) {
        throw new BadRequestException("There is no available balance to set payout schedule.");
      }
    }

    if (typeof weekly_anchor === "string") weekly_anchor = weekly_anchor.toLowerCase();
    const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

    const schedule = { interval };

    if (interval === "weekly") {
      if (!weekly_anchor || !weekdays.includes(weekly_anchor)) {
        throw new BadRequestException(`weekly_anchor must be one of: ${weekdays.join(", ")}`);
      }
      schedule.weekly_anchor = weekly_anchor;
    }

    if (interval === "monthly") {
      if (!Number.isInteger(monthly_anchor) || monthly_anchor < 1 || monthly_anchor > 31) {
        throw new BadRequestException("monthly_anchor must be an integer between 1 and 31");
      }
      schedule.monthly_anchor = monthly_anchor;
    }

    const account = await this.stripe.accounts.update(stripeAccount.account_id, {
      settings: { payouts: { schedule } },
    });

    return {
      statusCode: 200,
      message: "Payout schedule updated",
      details: {
        accountId: account.id,
        interval: account.settings.payouts.schedule.interval,
        weekly_anchor: account.settings.payouts.schedule.weekly_anchor ?? null,
        monthly_anchor: account.settings.payouts.schedule.monthly_anchor ?? null,
      },
    };
  }
}
