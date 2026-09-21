import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { AuthManager } from "../PropertyHandler/auth/authManager.js";
import { SystemManagerRepository } from "../PropertyHandler/data/repository/systemManagerRepository.js";
import { getEnterpriseBillingDetails } from "./activePropertyCalculator.js";

const authManager = new AuthManager(
  new DynamoDBClient({}),
  new SystemManagerRepository()
);

export const handler = async (event) => {
  try {
    const accessToken =
      event.headers?.Authorization ||
      event.headers?.authorization;

    await authManager.authorizeGroupRequest(accessToken, "Host");

    const enterpriseId = event.pathParameters?.enterpriseId;

    if (!enterpriseId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "enterpriseId is required",
        }),
      };
    }

    const billingDetails =
      await getEnterpriseBillingDetails(enterpriseId);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        enterpriseId,
        planName: "Enterprise",
        ...billingDetails,
      }),
    };
  } catch (error) {
    console.error("Failed to get enterprise subscription:", error);

    return {
      statusCode: error.statusCode || 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message:
          error.statusCode === 401 || error.statusCode === 403
            ? error.message
            : "Failed to retrieve enterprise subscription",
      }),
    };
  }
};