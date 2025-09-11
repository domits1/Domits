import Stripe from "stripe";
import AWS from "aws-sdk";
import "dotenv/config";

// Initialize AWS SDK and Stripe client
const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: "eu-north-1" });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function getExistingStripeAccount(cognitoUserId) {
  console.log("Checking for existing Stripe account for cognitoUserId:", cognitoUserId);
  const params = {
    TableName: "stripe_connected_accounts",
    IndexName: "UserIdIndex",
    KeyConditionExpression: "user_id = :user_id",
    ExpressionAttributeValues: {
      ":user_id": cognitoUserId,
    },
  };

  const result = await dynamoDb.query(params).promise();
  console.log("Query result:", JSON.stringify(result, null, 2));
  return result.Items.length ? result.Items[0] : null;
}

async function getNextSequenceNumber() {
  const counterParams = {
    TableName: "stripe_connected_accounts",
    Key: { id: 0 },
    UpdateExpression: "SET #seq_num = if_not_exists(#seq_num, :start) + :inc",
    ExpressionAttributeNames: { "#seq_num": "sequence_number" },
    ExpressionAttributeValues: { ":inc": 1, ":start": 0 },
    ReturnValues: "UPDATED_NEW",
  };

  const response = await dynamoDb.update(counterParams).promise();
  console.log("Updated sequence number:", response.Attributes.sequence_number);
  return response.Attributes.sequence_number;
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
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "OPTIONS, POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
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

    const sequenceNumber = await getNextSequenceNumber();
    const currentTime = new Date().toISOString();

    const dynamoDbParams = {
      TableName: "stripe_connected_accounts",
      Item: {
        id: sequenceNumber,
        account_id: account.id,
        user_id: cognitoUserId,
        created_at: currentTime,
        updated_at: currentTime,
      },
    };

    console.log("Saving new Stripe account to DynamoDB...");
    await dynamoDb.put(dynamoDbParams).promise();

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: body.refreshUrl || "https://domits.com/",
      return_url: body.returnUrl || "https://domits.com/login",
      type: "account_onboarding",
    });

    console.log("Account link for new account created:", accountLink.url);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        message: "New account created, redirecting to Stripe onboarding.",
        url: accountLink.url,
      }),
    };
  } catch (error) {
    console.error("Error in handler:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        message: "Error creating Stripe account or writing to DynamoDB",
        error: error.message,
      }),
    };
  }
}
