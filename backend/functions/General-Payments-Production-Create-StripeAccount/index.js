import StripeAccountController from "./controller/stripeAccountController.js";

const controller = new StripeAccountController();

export const handler = async (event) => {
  let returnedResponse = {};

  // We’re passing the raw event directly to the controller
  switch (event.httpMethod) {
    case "POST":
      returnedResponse = await controller.create(event);
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
