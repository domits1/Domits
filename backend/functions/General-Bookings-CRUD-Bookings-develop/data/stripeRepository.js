import Stripe from 'stripe';
import { DynamoDBClient, QueryCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import NotFoundException from "../util/exception/NotFoundException.js"
import SystemManagerRepository from './systemManagerRepository.js';

const systemManagerRepository = new SystemManagerRepository();
const stripePromise = systemManagerRepository
  .getSystemManagerParameter("/stripe/keys/secret/test")
  .then(secret => new Stripe(secret));

const client = new DynamoDBClient({ region: "eu-north-1" });
//console.log(await systemManagerRepository.getSystemManagerParameter("/stripe/keys/secret/test")); kept incase of deploying issues (check here first)

class StripeRepository {
  async createPaymentIntent(account_id) {
    const stripe = await stripePromise;
    const total = 50000;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      application_fee_amount: total * 0.15,
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
  }

  // --------
  // Query table "stripe-connected-accounts" and find their respective
  // stripe account_id, and give it back.
  // --------
  async getStripeAccountId(userId) {
    console.log("Querying user Stripe Account ID: ", userId);
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

    async function createCheckoutSession() {
      // const stripe = await stripePromise;
      // const session = await stripe.checkout.sessions.create({
      //   success_url: 'https://example.com/success',
      //   line_items: [
      //     {
      //       price: "500",
      //       quantity: 2,
      //     },
      //   ],
      //   mode: 'payment',
      // });
      // const response = await client.send(session);
      // console.log(response);
      // return response;
      return "https://example.com/success";
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