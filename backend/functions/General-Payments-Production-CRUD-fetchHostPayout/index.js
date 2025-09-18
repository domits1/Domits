import Stripe from "stripe";
import "dotenv/config";
import { Controller } from "./controller/controller.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const controller = new Controller();

export const handler = async (event) => {
  const { userId } = 15;

  try {
    const payouts = await stripe.payouts.list({
      limit: 5,
      stripeAccount: userId,
    });

    const payoutDetails = payouts.data.map((payout) => ({
      id: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency.toUpperCase(),
      status: payout.status,
      arrivalDate: new Date(payout.arrival_date * 1000).toLocaleDateString(),
      createdDate: new Date(payout.created * 1000).toLocaleDateString(),
      method: payout.method,
      type: payout.type,
      destination: payout.destination,
      failureMessage: payout.failure_message || null,
      balanceTransactionId: payout.balance_transaction || null,
      automatic: payout.automatic,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ payoutDetails }),
    };
  } catch (error) {
    console.error("Error fetching payouts:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to retrieve payout information." }),
    };
  }
};
