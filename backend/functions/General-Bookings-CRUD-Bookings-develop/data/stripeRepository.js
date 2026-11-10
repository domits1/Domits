import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import NotFoundException from "../util/exception/NotFoundException.js";
import SystemManagerRepository from "./systemManagerRepository.js";
import CalculateTotalRate from "../util/calcuateTotalRate.js";
import {
  calculateDirectBookingCommission,
  STANDALONE_SITE_BOOKING_SOURCE,
} from "../util/directBookingCommission.js";
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
  constructor({
    databaseProvider = () => Database.getInstance(),
    stripeProvider = () => stripePromise,
    clock = () => new Date(),
  } = {}) {
    this.databaseProvider = databaseProvider;
    this.stripeProvider = stripeProvider;
    this.clock = clock;
  }

  getClient() {
    return this.stripeProvider();
  }

  async getDirectBookingCommission(bookingId, hostId) {
    const database = await this.databaseProvider();
    const booking = await database.getRepository(Booking).findOneBy({ id: bookingId });
    if (!booking) {
      throw new NotFoundException("Booking not found.");
    }
    if (hostId && booking.hostid !== hostId) {
      throw new NotFoundException("Booking host does not match the payment host.");
    }
    return this.calculateBookingCommission(database, booking);
  }

  async calculateBookingCommission(database, booking) {
    if (booking.booking_source !== STANDALONE_SITE_BOOKING_SOURCE) {
      return null;
    }

    if (booking.commissionable_accommodation_cents === null || booking.commissionable_accommodation_cents === undefined) {
      return null;
    }
    const commissionableAccommodationCents = Number(booking.commissionable_accommodation_cents);
    if (!Number.isSafeInteger(commissionableAccommodationCents) || commissionableAccommodationCents <= 0) {
      throw new Error("Direct booking website booking has an invalid commissionable accommodation amount.");
    }

    const year = this.clock().getUTCFullYear();
    const yearStart = Date.UTC(year, 0, 1);
    const nextYearStart = Date.UTC(year + 1, 0, 1);
    const revenueResult = await database
      .getRepository(Booking)
      .createQueryBuilder("booking")
      .select(
        "COALESCE(SUM(booking.commissionable_accommodation_cents), 0)",
        "annual_revenue_cents"
      )
      .where("booking.hostid = :hostId", { hostId: booking.hostid })
      .andWhere("booking.booking_source = :bookingSource", {
        bookingSource: STANDALONE_SITE_BOOKING_SOURCE,
      })
      .andWhere("booking.status = :status", { status: "Paid" })
      .andWhere("booking.createdat >= :yearStart", { yearStart })
      .andWhere("booking.createdat < :nextYearStart", { nextYearStart })
      .andWhere("booking.id <> :bookingId", { bookingId: booking.id })
      .andWhere("booking.commissionable_accommodation_cents IS NOT NULL")
      .getRawOne();

    const annualRevenueBeforeBookingCents = Number(revenueResult?.annual_revenue_cents ?? 0);
    if (!Number.isSafeInteger(annualRevenueBeforeBookingCents) || annualRevenueBeforeBookingCents < 0) {
      throw new Error("Unable to calculate annual direct booking revenue safely.");
    }

    return {
      ...calculateDirectBookingCommission({
        annualRevenueBeforeBookingCents,
        commissionableAccommodationCents,
      }),
      year,
      commissionableAccommodationCents,
    };
  }

  async createPaymentIntent(account_id, propertyId, dates, bookingId, hostId, commissionOverride = null) {
    try {
      if (!account_id || !propertyId || !dates || !bookingId) {
        throw new NotFoundException(
          "account_id, propertyId, dates, or bookingId is missing. This information is needed to create a PaymentIntent."
        );
      }

      const stripe = await this.stripeProvider();
      const client = await this.databaseProvider();
      const booking = await client.getRepository(Booking).findOneBy({ id: bookingId });
      if (!booking) {
        throw new NotFoundException("Booking not found.");
      }
      if (hostId && booking.hostid !== hostId) {
        throw new NotFoundException("Booking host does not match the payment host.");
      }

      let hostCents;
      let platformCents;
      let totalCents;
      let commission = null;
      const metadata = { propertyId, dates: JSON.stringify(dates), bookingId };

      const hasCommissionableAccommodation =
        booking.commissionable_accommodation_cents !== null &&
        booking.commissionable_accommodation_cents !== undefined;
      const commissionableAccommodationCents = Number(booking.commissionable_accommodation_cents);
      if (booking.booking_source === STANDALONE_SITE_BOOKING_SOURCE && hasCommissionableAccommodation) {
        if (!Number.isSafeInteger(commissionableAccommodationCents) || commissionableAccommodationCents <= 0) {
          throw new Error("Direct booking website booking has an invalid commissionable accommodation amount.");
        }
        totalCents = Math.round(Number(booking.total_price) * 100);
        if (
          !Number.isSafeInteger(totalCents) ||
          totalCents <= 0 ||
          totalCents < commissionableAccommodationCents
        ) {
          throw new Error("Direct booking website booking has an invalid quoted total.");
        }

        const canReuseCommission =
          commissionOverride &&
          commissionOverride.commissionableAccommodationCents === commissionableAccommodationCents &&
          Number.isSafeInteger(commissionOverride.year) &&
          Number.isSafeInteger(commissionOverride.annualRevenueCents) &&
          Number.isSafeInteger(commissionOverride.commissionAmountCents) &&
          Number.isFinite(commissionOverride.rate);
        const commissionResult =
          (canReuseCommission && commissionOverride) ||
          (await this.calculateBookingCommission(client, booking));
        const year = commissionResult.year;

        platformCents = commissionResult.commissionAmountCents;
        hostCents = totalCents - platformCents;
        commission = {
          rate: commissionResult.rate,
          amountCents: commissionResult.commissionAmountCents,
          annualRevenueCents: commissionResult.annualRevenueCents,
          year,
        };
        Object.assign(metadata, {
          bookingSource: STANDALONE_SITE_BOOKING_SOURCE,
          commissionRate: String(commission.rate),
          commissionAmountCents: String(commission.amountCents),
          commissionableAccommodationCents: String(commissionableAccommodationCents),
          annualRevenueCents: String(commission.annualRevenueCents),
          commissionYear: String(year),
        });
      } else {
        const legacyBreakdown = await CalculateTotalRate(propertyId, dates);
        hostCents = legacyBreakdown.hostCents;
        platformCents = legacyBreakdown.platformCents;
        totalCents = legacyBreakdown.totalCents;
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
        },
        commission,
      };
    } catch (error) {
      console.error("Error creating payment intent:", error);
      if (
        error?.code === "DIRECT_BOOKING_ENTERPRISE_RATE_REQUIRED" ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new Error("Failed to create payment intent.");
    }
  }
  // --------
  // Query table "stripe-connected-accounts" and find their respective
  // stripe account_id, and give it back.
  // --------
  async getStripeAccountId(userId) {
    const client = await this.databaseProvider();
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

  async addPaymentToTable(paymentData) {
    const client = await this.databaseProvider();
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
    const client = await this.databaseProvider();
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
      const stripe = await this.stripeProvider();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
      return paymentIntent ? paymentIntent : null;
    } catch (error) {
      console.error(error);
      throw new NotFoundException("PaymentIntentNotFound.");
    }
  }

  async updatePaymentId(bookingId, stripePaymentId, totalCents = null, commission = null) {
    const client = await this.databaseProvider();
    const updateObject = { paymentid: stripePaymentId };

    if (typeof totalCents === "number" && Number.isFinite(totalCents)) {
      updateObject.total_price = Math.round(totalCents) / 100;
    }

    if (commission) {
      updateObject.commission_rate = commission.rate;
      updateObject.commission_amount_cents = commission.amountCents;
      updateObject.commission_annual_revenue_cents = commission.annualRevenueCents;
      updateObject.commission_year = commission.year;
    }

    await client.createQueryBuilder().update(Booking).set(updateObject).where("id = :id", { id: bookingId }).execute();
  }
}

export default StripeRepository;
