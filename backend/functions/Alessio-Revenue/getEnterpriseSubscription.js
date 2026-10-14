import { CognitoRepository } from "./data/cognitoRepository.js";
import { getEnterpriseBillingDetails } from "./activePropertyCalculator.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

const cognitoRepository = new CognitoRepository();

function getAccessToken(event) {
  return event.headers?.Authorization || event.headers?.authorization;
}

function getGroup(user) {
  return user.UserAttributes?.find(
    (attribute) => attribute.Name === "custom:group"
  )?.Value;
}

export const handler = async (event) => {
  try {
    const accessToken = getAccessToken(event);

    if (!accessToken) {
      return {
        statusCode: 401,
        headers: responseHeaders,
        body: JSON.stringify({
          message: "You must be logged in.",
        }),
      };
    }

    const user = await cognitoRepository.getUserByAccessToken(accessToken);

    if (getGroup(user) !== "Host") {
      return {
        statusCode: 403,
        headers: responseHeaders,
        body: JSON.stringify({
          message: "You must be a Host.",
        }),
      };
    }

    const enterpriseId = event.pathParameters?.enterpriseId;

    if (!enterpriseId) {
      return {
        statusCode: 400,
        headers: responseHeaders,
        body: JSON.stringify({
          message: "enterpriseId is required",
        }),
      };
    }

    const billingDetails = await getEnterpriseBillingDetails(
      enterpriseId,
      user.Username
    );

    return {
      statusCode: 200,
      headers: responseHeaders,
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
      headers: responseHeaders,
      body: JSON.stringify({
        message:
          error.statusCode === 403
            ? error.message
            : "Failed to retrieve enterprise subscription",
      }),
    };
  }
};