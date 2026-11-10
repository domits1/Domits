import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import NotFoundException from "../util/exception/NotFoundException.js";
import SystemManagerRepository from "./systemManagerRepository.js";
import CalculateTotalRate from "../util/calcuateTotalRate.js";
import { Payment } from "database/models/Payment";
import Database from "database";
import { Booking } from "database/models/Booking";
import { Stripe_Connected_Accounts } from "database/models/Stripe_Connected_Accounts";

const systemManagerRepository = new SystemManagerRepository();
const STRIPE_MODES = new Set(["live", "test"]);
const STRIPE_MODE = String(process.env.STRIPE_MODE || "live")
  .trim()
  .toLowerCase();
if (!STRIPE_MODES.has(STRIPE_MODE)) {
  throw new Error(`Unsupported STRIPE_MODE: "${STRIPE_MODE}". Expected "live" or "test".`);
}

const STRIPE_SECRET_PARAMETER = `/stripe/keys/secret/${STRIPE_MODE}`;
const useFakeStripe = process.env.TEST === "true" && !process.env.STRIPE_MODE;
const stripePromise = useFakeStripe
  ? Promise.resolve({
    paymentIntents: {
      create: async () => ({
        id: `test_${randomUUID()}`,
        client_secret: `test_secret_${randomUUID()}`,
      }),
    },
  })
  : systemManagerRepository
    .getSystemManagerParameter(STRIPE_SECRET_PARAMETER)
    .then((secret) => new Stripe(secret));

const client = new DynamoDBClient({ region: "eu-north-1" });

class StripeRepository {
  getClient() {
    return stripePromise;
  }

  async createPaymentIntent(account_id, propertyId, dates, bookingId, commissionSnapshot = null) {
    try {
      if (!account_id || !propertyId || !dates) {
        console.error(`accountId ${account_id}, property_id ${propertyId}, or dates ${dates} are NaN.`);
        throw new NotFoundException(
          "account_id, propertyId, or dates is missing. This information is needed to create a PaymentIntent.",
        );
      }

      const stripe = await stripePromise;

      const { hostCents, platformCents, totalCents } = commissionSnapshot
        ? {
            hostCents: commissionSnapshot.customerPaysCents - commissionSnapshot.commissionAmountCents,
            platformCents: commissionSnapshot.commissionAmountCents,
            totalCents: commissionSnapshot.customerPaysCents,
          }
        : await CalculateTotalRate(propertyId, dates);

      const metadata = { propertyId, dates: JSON.stringify(dates), bookingId };
      if (commissionSnapshot) {
        Object.assign(metadata, {
          bookingSource: "STANDALONE_SITE",
          commissionableAmountCents: String(commissionSnapshot.commissionableAmountCents),
          commissionRateBps: String(commissionSnapshot.commissionRateBps),
          commissionAmountCents: String(commissionSnapshot.commissionAmountCents),
          annualRevenueCents: String(commissionSnapshot.annualRevenueCents),
          commissionPeriodStart: String(commissionSnapshot.periodStart),
        });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalCents),
        currency: "eur",
        payment_method_types: ["card", "ideal", "klarna"],
        transfer_data: {
          destination: account_id,
        },
        application_fee_amount: Math.round(platformCents),
        metadata,
      });

      return {
        stripePaymentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret,
        breakdown: {
          customerPays: totalCents,
          hostReceives: hostCents,
          platformFeeGross: platformCents,
          ...(commissionSnapshot
            ? {
                commissionableAmountCents: commissionSnapshot.commissionableAmountCents,
                commissionRateBps: commissionSnapshot.commissionRateBps,
                commissionAmountCents: commissionSnapshot.commissionAmountCents,
                annualRevenueCents: commissionSnapshot.annualRevenueCents,
              }
            : {}),
        },
      };
    } catch (error) {
      console.error("Error creating payment intent:", error);
      throw new Error("Failed to create payment intent.");
    }
  }

  // --------
  // Query table "stripe-connected-accounts" and find their respective
  // stripe account_id, and give it back.
  // --------
  async getStripeAccountId(userId) {
    const client = await Database.getInstance();
    const query = await client
      .getRepository(Stripe_Connected_Accounts)
      .createQueryBuilder("stripe_connectedaccounts")
      .select(["stripe_connectedaccounts.account_id"])
      .where("stripe_connectedaccounts.user_id = :user_id", { user_id: userId })
      .getOne();

    if (query < 1) {
      throw new NotFoundException("No stripeaccount for userid!");
    }
    return query.account_id;
  }

  async getBookingForPayment(bookingId) {
    const client = await Database.getInstance();
    return client.getRepository(Booking)
      .createQueryBuilder("booking")
      .select([
        "booking.id",
        "booking.hostid",
        "booking.booking_source",
        "booking.total_price",
        "booking.commissionable_amount_cents",
      ])
      .where("booking.id = :bookingId", { bookingId })
      .getOne();
  }

  async getAnnualDirectBookingRevenueCents(hostId, periodStart, periodEnd) {
    const client = await Database.getInstance();
    const result = await client.getRepository(Booking)
      .createQueryBuilder("booking")
      .select("COALESCE(SUM(booking.commissionable_amount_cents), 0)", "revenueCents")
      .where("booking.hostid = :hostId", { hostId })
      .andWhere("booking.booking_source = :bookingSource", { bookingSource: "STANDALONE_SITE" })
      .andWhere("booking.status = :paidStatus", { paidStatus: "Paid" })
      .andWhere("booking.paid_at >= :periodStart", { periodStart })
      .andWhere("booking.paid_at < :periodEnd", { periodEnd })
      .andWhere("booking.commissionable_amount_cents IS NOT NULL")
      .getRawOne();
    const revenueCents = Number(result?.revenueCents || 0);
    if (!Number.isSafeInteger(revenueCents) || revenueCents < 0) {
      throw new Error("Annual direct booking revenue could not be calculated safely.");
    }
    return revenueCents;
  }

  async addPaymentToTable(paymentData) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .insert()
      .into(Payment)
      .values({
        stripepaymentid: paymentData.stripePaymentId,
        stripeclientsecret: paymentData.stripeClientSecret,
      })
      .execute();

    try {
      await this.getPaymentByPaymentId(paymentData.stripePaymentId);
    } catch (error) {
      console.error("Something unexpected happenend attempting to save the payment information.");
      throw new NotFoundException(`Unable to save payment data in the table. 
        Attempted to query ${paymentData.stripePaymentId} but no results were returned.`);
    }
  }

  async getPaymentByPaymentId(stripePaymentId) {
    const client = await Database.getInstance();
    const query = await client
      .getRepository(Payment)
      .createQueryBuilder("payment")
      .where("payment.stripepaymentid = :stripepaymentid", { stripepaymentid: stripePaymentId })
      .getOne();

    if (!query) {
      throw new NotFoundException("Payment not found.");
    } else {
      return query;
    }
  }

  async getPaymentIntentByPaymentId(paymentId) {
    try {
      const stripe = await stripePromise;
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
      return paymentIntent ? paymentIntent : null;
    } catch (error) {
      console.error(error);
      throw new NotFoundException("PaymentIntentNotFound.");
    }
  }

  async updatePaymentId(bookingId, stripePaymentId, totalCents = null, commissionSnapshot = null) {
    const client = await Database.getInstance();
    const updateObject = { paymentid: stripePaymentId };

    if (typeof totalCents === "number" && Number.isFinite(totalCents)) {
      updateObject.total_price = Math.round(totalCents) / 100;
    }

    if (commissionSnapshot) {
      Object.assign(updateObject, {
        commissionable_amount_cents: commissionSnapshot.commissionableAmountCents,
        domits_commission_rate_bps: commissionSnapshot.commissionRateBps,
        domits_commission_amount_cents: commissionSnapshot.commissionAmountCents,
        domits_commission_annual_revenue_cents: commissionSnapshot.annualRevenueCents,
        domits_commission_period_start: commissionSnapshot.periodStart,
      });
    }

    await client.createQueryBuilder().update(Booking).set(updateObject).where("id = :id", { id: bookingId }).execute();
  }
}

export default StripeRepository;
