import Stripe from "stripe";
import "dotenv/config";
import Database from "database";
import { Stripe_Connected_Accounts } from "database/models/Stripe_Connected_Accounts";
import responsejson from "./util/constant/responseheader.json" with { type: 'json' };
const responseHeaderJSON = responsejson


const client = await Database.getInstance();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {

  const userSub = JSON.parse(event.body).sub;
  if (!userSub) {
    return { statusCode: 400, headers: responseHeaderJSON, body: JSON.stringify({ error: "User sub is required" }) };
  }

  try {
    const repo = client.getRepository(Stripe_Connected_Accounts);
    const record = await repo.findOne({ where: { user_id: userSub } });
    console.log("Account", record);

    if (!record) {
      return {
        statusCode: 200,
        headers: responseHeaderJSON,
        body: JSON.stringify({
          hasStripeAccount: false,
          accountId: null,
          onboardingUrl: null,
          loginLinkUrl: null,
          bankDetailsProvided: false,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          readyForPayments: false,
        }),
      };
    }

    // Record bestaat
    const accountId = record.account_id;

    let onboardingComplete = false;
    let chargesEnabled = false;
    let payoutsEnabled = false;
    let bankDetailsProvided = false;
    let loginLinkUrl = null;
    let onboardingUrl = null;

    try {
      const acct = await stripe.accounts.retrieve(accountId);
      onboardingComplete = acct.details_submitted === true;
      chargesEnabled = acct.charges_enabled === true;
      payoutsEnabled = acct.payouts_enabled === true;
      bankDetailsProvided = (acct.external_accounts?.data?.length || 0) > 0;

      if (!onboardingComplete) {
        // Belangrijk: zolang onboarding niet af is, geef een verse onboarding link terug
        const link = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: process.env.STRIPE_REFRESH_URL || "https://domits.com/",
          return_url: process.env.STRIPE_RETURN_URL || "https://domits.com/login",
          type: "account_onboarding",
        });
        onboardingUrl = link.url;
      } else {
        // Pas na onboarding: login link
        try {
          const login = await stripe.accounts.createLoginLink(accountId);
          loginLinkUrl = login.url;
        } catch (e) {
          console.warn("Could not create login link:", e.message);
        }
      }
    } catch (e) {
      console.warn("Could not retrieve Stripe account:", e.message);
    }

    return {
      statusCode: 200,
      headers: responseHeaderJSON,
      body: JSON.stringify({
        hasStripeAccount: true,
        accountId,
        onboardingUrl,
        loginLinkUrl,
        bankDetailsProvided,
        onboardingComplete,
        chargesEnabled,
        payoutsEnabled,
        readyForPayments: chargesEnabled && payoutsEnabled,
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
