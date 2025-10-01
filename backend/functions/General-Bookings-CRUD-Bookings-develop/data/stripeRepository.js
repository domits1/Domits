import Stripe from 'stripe';
import { DynamoDBClient, QueryCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import NotFoundException from "../util/exception/NotFoundException.js"
import SystemManagerRepository from './systemManagerRepository.js';
import CalculateTotalRate from '../util/calcuateTotalRate.js';
import { Payment } from 'database/models/Payment';
import Database from 'database';
import { Booking } from 'database/models/Booking';

const systemManagerRepository = new SystemManagerRepository();
const stripePromise = systemManagerRepository
  .getSystemManagerParameter("/stripe/keys/secret/live")
  .then(secret => new Stripe(secret));

const client = new DynamoDBClient({ region: "eu-north-1" });

class StripeRepository {
  async createPaymentIntent(account_id, propertyId, dates) {
    try {
      if(!account_id || !propertyId || !dates)
      {
        console.error(`accountId ${account_id}, property_id, ${propertyId}, or dates ${dates} are NaN.`);
        throw new NotFoundException("account_id, propertyId, or dates is missing. This information is needed to create a PaymentIntent.")
      }
      const stripe = await stripePromise;
      const total = await CalculateTotalRate(propertyId, dates);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 50,
        application_fee_amount: Math.round(total * 0.15),
        currency: 'eur',
        payment_method_types: ["card", "ideal", "klarna"],
        transfer_data: {
          destination: account_id,
        },
      });
      return {
        stripePaymentId: paymentIntent.id,
        stripeClientSecret: paymentIntent.client_secret
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
    const input = {
      TableName: "stripe_connected_accounts",
      IndexName: "UserIdIndex",
      KeyConditionExpression: "user_id = :partitionKey",
      ProjectionExpression: "account_id",
      ExpressionAttributeValues: {
        ":partitionKey": { S: userId }
      },
    }
    try {
      const command = new QueryCommand(input);
      const response = await client.send(command);
      return response.Items[0].account_id.S;
    } catch (error) {
      throw new Error("Unable to find a Stripe Account ID.", error);
    }
  }

  async addPaymentToTable(paymentData) {
    const client = await Database.getInstance();
    await client
    .createQueryBuilder()
    .insert()
    .into(Payment)
    .values({
      stripepaymentid: paymentData.stripePaymentId,
      stripeclientsecret: paymentData.stripeClientSecret
      })
      .execute();

      try {
        await this.getPaymentByPaymentId(paymentData.stripePaymentId)
      } catch (error) {
        console.error("Something unexpected happenend attempting to save the payment information.")
        throw new NotFoundException(`Unable to save payment data in the table. 
        Attempted to query ${paymentData.stripePaymentId} but no results were returned.`);
      }
  }

  async getPaymentByPaymentId(stripePaymentId) {
    const client = await Database.getInstance();
    const query = await client
      .getRepository(Payment)
      .createQueryBuilder("payment")
      .where("payment.stripepaymentid = :stripepaymentid", { stripepaymentid: stripePaymentId})
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
        .where("id = :id", { id: bookingId})
        .execute();
  }
}
export default StripeRepository;