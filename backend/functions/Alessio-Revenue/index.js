import Controller from "./controller/controller.js";
import { handler as enterpriseSubscriptionHandler } from "./getEnterpriseSubscription.js";

const controller = new Controller();

export const handler = async (event) => {
  if (
    event.httpMethod === "GET" &&
    event.pathParameters?.enterpriseId
  ) {
    return await enterpriseSubscriptionHandler(event);
  }

  if (event.httpMethod === "GET") {
    return await controller.getHostKpi(event);
  }

  return {
    statusCode: 400,
    body: "Bad Request: Unsupported HTTP method",
  };
};