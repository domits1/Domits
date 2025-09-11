import Stripe from "stripe";
import "dotenv/config";
import Database from "database";
import { Stripe_Connected_Accounts } from "database/models/Stripe_Connected_Accounts";


const client = await Database.getInstance();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

export const handler = async (event) => {
  // Define CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Replace "*" with your domain in production
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Credentials": true,
  };

  // Handle CORS preflight (OPTIONS) request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "CORS preflight response" }),
    };
  }

  // Validate and parse the request body
  let requestBody;
  try {
    if (event.body) {
      // Handle both stringified JSON and direct JSON in body
      requestBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } else if (event.sub) {
      // Fallback if `sub` is sent directly at the root of the event
      requestBody = { sub: event.sub };
    } else {
      throw new Error("No valid body or sub in event");
    }
  } catch (error) {
    console.error("Invalid request body:", error);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Invalid request body or missing sub" }),
    };
  }

  const userSub = requestBody.sub;
  if (!userSub) {
    console.error("User sub is missing in the request body");
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "User sub is required" }),
    };
  }

  // Initialize variables for response
  let hasStripeAccount = false;
  let accountId = null;
  let loginLinkUrl = null;
  let bankDetailsProvided = false;

  try {
    const repo = client.getRepository(Stripe_Connected_Accounts);
    const record = await repo.findOne({ where: { user_id: userSub } });

    console.log("Account", record);

    if (!record) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          hasStripeAccount: false,
          accountId: null,
          loginLinkUrl: null,
          bankDetailsProvided: false,
        }),
      };
    }

    // Return success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        hasStripeAccount,
        accountId,
        loginLinkUrl,
        bankDetailsProvided,
      }),
    };
  } catch (error) {
    console.error("Error querying DynamoDB or interacting with Stripe:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Internal server error", details: error.message }),
    };
  }
};
