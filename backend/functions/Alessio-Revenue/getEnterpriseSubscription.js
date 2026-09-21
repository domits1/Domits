import { getEnterpriseBillingDetails } from "./activePropertyCalculator.js";

export const handler = async (event) => {
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

  try {
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
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Failed to retrieve enterprise subscription",
      }),
    };
  }
};