import { Controller } from "./controller/controller.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

let controller;

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: responseHeaders };
  }

  const publicRequest = event.httpMethod === "GET" && event.resource === "/properties/{propertyId}/reviews";
  const collectionRequest = event.resource === "/reviews" && ["GET", "POST"].includes(event.httpMethod);
  const individualRequest = event.resource === "/reviews/{id}" && ["GET", "PATCH"].includes(event.httpMethod);
  const responseRequest = (event.resource === "/reviews/{id}/response" && ["POST", "PATCH"].includes(event.httpMethod)) ||
    (event.resource === "/reviews/{id}/response/publish" && event.httpMethod === "POST");
  if (!publicRequest && !collectionRequest && !individualRequest && !responseRequest) {
    return {
      statusCode: 405,
      headers: responseHeaders,
      body: JSON.stringify({ message: "Method or resource not supported." }),
    };
  }

  try {
    controller ??= new Controller();
    if (responseRequest) return await controller.saveHostResponse(event);
    if (publicRequest) return await controller.getPublicReviews(event);
    return await (event.httpMethod === "POST" ? controller.createReview(event) : controller.manageReviews(event));
  } catch {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
