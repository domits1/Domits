import Stripe from 'stripe';
import { DynamoDBClient, QueryCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import NotFoundException from "../util/exception/NotFoundException.js"
import SystemManagerRepository from './systemManagerRepository.js';
import CalculateTotalRate from '../util/calcuateTotalRate.js';

const systemManagerRepository = new SystemManagerRepository();
const stripePromise = systemManagerRepository
  .getSystemManagerParameter("/stripe/keys/secret/test")
  .then(secret => new Stripe(secret));

const client = new DynamoDBClient({ region: "eu-north-1" });

class StripeRepository {
  async createPaymentIntent(account_id, propertyId, dates) {
    try {
      const stripe = await stripePromise;
      const total = await CalculateTotalRate(propertyId, dates);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: total,
        application_fee_amount: Math.round(total * 0.15),
        currency: 'eur',
        payment_method_types: ["card", "ideal"],
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

  async addPaymentToTable(bookingId, paymentData) {
    const params = new PutItemCommand({
      "TableName": "payment-develop",
      "Item": {
        bookingId: { S: bookingId },
        stripePaymentId: { S: paymentData.stripePaymentId.toString() },
        stripeClientSecret: { S: paymentData.stripeClientSecret.toString() },
      },
    })
    try {
      const response = await client.send(params);
      return await createCheckoutSession();
    } catch (error) {
      console.error(error)
      throw new Error("Failed to save payment data.");
    }
  }

  async getPaymentByBookingId(bookingId) {
    const params = new QueryCommand({
      "TableName": "payment-develop",
      "IndexName": "bookingId-stripePaymentId-index",
      "KeyConditionExpression": "#bookingId = :bookingId",
      "ExpressionAttributeNames": {
        '#bookingId': 'bookingId',
      },
      "ExpressionAttributeValues": {
        ":bookingId": {
          "S": bookingId
        }
      }
    });
    const response = await client.send(params);
    if (response.Count < 1) {
      throw new NotFoundException("Payment not found.");
    } else {
      return unmarshall(response.Items[0]);
    }
  }

  async getPaymentIntentByPaymentId(id) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(id);
      return paymentIntent ? paymentIntent : null;
    } catch (error) {
      throw new NotFoundException("PaymentIntentNotFound.");
    }
  }
}
export default StripeRepository;