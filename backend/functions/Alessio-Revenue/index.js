import Controller from "./controller/controller.js";

const controller = new Controller();

export const handler = async (event) => {
  let returnedResponse = {};

  switch (event.httpMethod) {
    case "GET":
      returnedResponse = await controller.getBookingByHostId(event);
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