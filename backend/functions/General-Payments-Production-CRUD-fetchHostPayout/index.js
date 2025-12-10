import StripePayoutsController from "./controller/stripePayoutsController.js";

const controller = new StripePayoutsController();

export const handler = async (event) => {
  const { path, httpMethod } = event;
  let returnedResponse = {};

  switch (true) {
    case httpMethod === "POST" && path.endsWith("/set-payout-schedule"):
      returnedResponse = await controller.setPayoutSchedule(event);
      break;
    case httpMethod === "POST" && path.endsWith("/add-user-bank-account"):
      returnedResponse = await controller.addHostBankAccount(event);
      break;
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
    case httpMethod === "GET" && path.endsWith("/retrieve-user-payout-schedule"):
      returnedResponse = await controller.getPayoutSchedule(event);
      break;
    case httpMethod === "GET" && path.endsWith("/retrieve-user-bank-account"):
      returnedResponse = await controller.getHostBankAccount(event);
      break;
    case httpMethod === "DELETE" && path.endsWith("/delete-user-bank-account"):
      returnedResponse = await controller.deleteHostBankAccount(event);
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
