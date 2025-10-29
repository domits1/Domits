import StripePayoutsController from "./controller/stripePayoutsController.js";

const controller = new StripePayoutsController();

export const handler = async (event) => {
  const { path, httpMethod } = event;
  let returnedResponse = {};

  switch (true) {
    case httpMethod === "GET" && path.endsWith("/retrieve-user-payouts"):
      returnedResponse = await controller.getHostPayouts(event);
      break;
    case httpMethod === "GET" && path.endsWith("/retrieve-user-charges"):
      returnedResponse = await controller.getHostCharges(event);
      break;
    case httpMethod === "GET" && path.endsWith("/retrieve-user-balance"):
      returnedResponse = await controller.getHostBalance(event);
      break;
    case httpMethod === "GET" && path.endsWith("/retrieve-user-pending-amount"):
      returnedResponse = await controller.getHostPendingAmount(event);
      break;
    default:
      throw new Error("Unable to determine request type. Please contact the Admin.");
  }

  return {
    statusCode: returnedResponse?.statusCode || 200,
    headers: returnedResponse?.headers || {},
    body: JSON.stringify(returnedResponse?.response),
  };
};
