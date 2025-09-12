import Stripe from "stripe";
import "dotenv/config";
import Database from "database";
import { Stripe_Connected_Accounts } from "database/models/Stripe_Connected_Accounts";

const client = await Database.getInstance();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Credentials": true,
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ message: "CORS preflight response" }) };
  }

  // Parse body
  let requestBody;
  try {
    requestBody = event.body ? (typeof event.body === "string" ? JSON.parse(event.body) : event.body) : {};
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  const userSub = requestBody.sub || event.sub;
  if (!userSub) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "User sub is required" }) };
  }

  try {
    const repo = client.getRepository(Stripe_Connected_Accounts);
    const record = await repo.findOne({ where: { user_id: userSub } });
    console.log("Account", record);

    // Niks gevonden in DB
    if (!record) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          hasStripeAccount: false,
          accountId: null,
          loginLinkUrl: null,
          bankDetailsProvided: false,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        }),
      };
    }

    // Wel gevonden in DB → flags invullen
    const accountId = record.account_id;
    let loginLinkUrl = null;
    let onboardingComplete = false;
    let chargesEnabled = false;
    let payoutsEnabled = false;
    let bankDetailsProvided = false;

    // Haal actuele status op bij Stripe
    try {
      const acct = await stripe.accounts.retrieve(accountId);
      onboardingComplete = acct.details_submitted === true;
      chargesEnabled = acct.charges_enabled === true;
      payoutsEnabled = acct.payouts_enabled === true;
      bankDetailsProvided = (acct.external_accounts?.data?.length || 0) > 0;

      // Login link werkt voor Express/Custom accounts
      try {
        const login = await stripe.accounts.createLoginLink(accountId);
        loginLinkUrl = login.url;
      } catch (e) {
        // kan mislukken als geen Express, is niet fataal
        console.warn("Could not create login link:", e.message);
      }
    } catch (e) {
      console.warn("Could not retrieve Stripe account:", e.message);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        hasStripeAccount: true,
        accountId,
        loginLinkUrl,
        bankDetailsProvided,
        onboardingComplete,
        chargesEnabled,
        payoutsEnabled,
      }),
    };
  } catch (error) {
    console.error("Error querying DB or interacting with Stripe:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error", details: error.message }),
    };
  }
};
