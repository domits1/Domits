import { Controller } from "./controller/controller.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

let controller;

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: responseHeaders };
  }

  const publicPropertyRead = event.httpMethod === "GET" && event.resource === "/properties/{propertyId}/reviews";
  const authenticatedOperation = (event.resource === "/reviews" && ["POST", "GET", "DELETE"].includes(event.httpMethod)) ||
    (event.resource === "/reviews/{id}" && event.httpMethod === "DELETE");
  if (!publicPropertyRead && !authenticatedOperation) {
    return {
      statusCode: 405,
      headers: responseHeaders,
      body: JSON.stringify({ message: "Method or resource not supported." }),
    };
  }

  try {
    controller ??= new Controller();
    if (publicPropertyRead) return await controller.getPublicPropertyReviews(event);
    return await (event.httpMethod === "POST" ? controller.createReview(event) : controller.manageReviews(event));
  } catch {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
