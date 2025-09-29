import Stripe from "stripe";
import "dotenv/config";
import StripeAccountRepository from "./data/stripeAccountRepository.js";
import AuthManager from "./auth/authManager.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const authManager = new AuthManager();
const stripeAccountRepository = new StripeAccountRepository();


export const handler = async (event) => {

  try {

    const token = event.headers.Authorization;

    const {sub: cognitoUserId } = await authManager.authenticateUser(token);

    if (!cognitoUserId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required field: cognitoUserId" }),
      };
    }

    const stripeAccount = await stripeAccountRepository.getExistingStripeAccount(cognitoUserId);

    if (!stripeAccount?.account_id) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "No Stripe account found for this user." }),
      };
    }

    // const testAccount = "";

    const payouts = await stripe.payouts.list({
      stripeAccount: stripeAccount.account_id,
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
