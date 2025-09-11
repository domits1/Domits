import Stripe from "stripe";
import "dotenv/config";
import Database from "database";
import { Stripe_Connected_Accounts } from "database/models/Stripe_Connected_Accounts";
import { randomUUID } from "crypto";
import responsejson from "./util/constant/responseheader.json" with { type: 'json' };

const responseHeaderJSON = responsejson

const client = await Database.getInstance();

// Initialize AWS SDK and Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function getExistingStripeAccount(cognitoUserId) {
  const repo = client.getRepository(Stripe_Connected_Accounts);
  const record = await repo.findOne({ where: { user_id: cognitoUserId } });

  console.log("Checking for existing Stripe account for cognitoUserId:", cognitoUserId);

  console.log("Existing Stripe account record:", record);

  console.log("Query result:", JSON.stringify(record, null, 2));
  return record || null;
}

export async function handler(event) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  let body;

  try {
    body = JSON.parse(event.body);
    console.log("Parsed Request Body:", body);

    const { userEmail, cognitoUserId } = body;
    if (!userEmail || !cognitoUserId) {
      throw new Error("Missing required fields: userEmail or cognitoUserId");
    }

    let stripeAccount = await getExistingStripeAccount(cognitoUserId);

    if (stripeAccount) {
      console.log("Stripe account exists. Creating account link...");
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccount.account_id,
        refresh_url: body.refreshUrl || "https://domits.com/",
        return_url: body.returnUrl || "https://domits.com/login",
        type: "account_onboarding",
      });

      console.log("Account link created:", accountLink.url);
      return {
        statusCode: 200,
        headers: responseHeaderJSON,
        body: JSON.stringify({
          message: "Account already exists, redirecting to Stripe onboarding.",
          url: accountLink.url,
        }),
      };
    }

    console.log("Creating a new Stripe account...");
    const account = await stripe.accounts.create({
      type: "express",
      email: userEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    const id = randomUUID();
    const currentTime = Date.now();
    console.log("Inserting new Stripe account record with:", {
      id,
      account_id: account.id,
      user_id: cognitoUserId,
      created_at: currentTime,
      updated_at: currentTime,
    });
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .insert()
      .into(Stripe_Connected_Accounts)
      .values({
        id: id,
        account_id: account.id,
        user_id: cognitoUserId,
        updated_at: currentTime,
        created_at: currentTime
      })
      .execute();

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: body.refreshUrl || "https://domits.com/",
      return_url: body.returnUrl || "https://domits.com/login",
      type: "account_onboarding",
    });

    console.log("Account link for new account created:", accountLink.url);
    return {
      statusCode: 200,
      headers: responseHeaderJSON,
      body: JSON.stringify({
        message: "New account created, redirecting to Stripe onboarding.",
        url: accountLink.url,
      }),
    };
  } catch (error) {
    console.error("Error in handler:", error);
    return {
      statusCode: 500,
      headers: responseHeaderJSON,
      body: JSON.stringify({
        message: "Error creating Stripe account or writing to DynamoDB",
        error: error.message,
      }),
    };
  }
}
