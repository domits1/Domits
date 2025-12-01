import Stripe from "stripe";
import { DynamoDBClient, QueryCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import NotFoundException from "../util/exception/NotFoundException.js";
import SystemManagerRepository from "./systemManagerRepository.js";
import CalculateTotalRate from "../util/calcuateTotalRate.js";
import { Payment } from "database/models/Payment";
import Database from "database";
import { Booking } from "database/models/Booking";
import "dotenv/config";
import { Stripe_Connected_Accounts } from "database/models/Stripe_Connected_Accounts";

const systemManagerRepository = new SystemManagerRepository();
const stripePromise = systemManagerRepository
  .getSystemManagerParameter("/stripe/keys/secret/live")
  .then((secret) => new Stripe(secret));

const client = new DynamoDBClient({ region: "eu-north-1" });

class StripeRepository {
  async createPaymentIntent(account_id, propertyId, dates, bookingId) {
    try {
      if (!account_id || !propertyId || !dates) {
        console.error(`accountId ${account_id}, property_id ${propertyId}, or dates ${dates} are NaN.`);
        throw new NotFoundException(
          "account_id, propertyId, or dates is missing. This information is needed to create a PaymentIntent."
        );
      }

      const stripe = await stripePromise;

      const { hostCents, platformCents, totalCents } = await CalculateTotalRate(propertyId, dates);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: 50,
        currency: "eur",
        payment_method_types: ["card", "ideal", "klarna"],
        transfer_data: {
          destination: account_id,
        },
        application_fee_amount: Math.round(platformCents),
        metadata: {
          propertyId,
          dates: JSON.stringify(dates),
          bookingId,
        },
      });

      return {
        stripePaymentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret,
        breakdown: {
          customerPays: totalCents,
          hostReceives: hostCents,
          platformFeeGross: platformCents,
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

  async updatePaymentId(bookingId, stripePaymentId) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .update(Booking)
      .set({ paymentid: stripePaymentId })
      .where("id = :id", { id: bookingId })
      .execute();
  }
}
export default StripeRepository;
