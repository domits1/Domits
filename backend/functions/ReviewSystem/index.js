import { Controller } from "./controller/controller.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

let controller;

const routes = new Map([
  ["/reviews", new Map([["GET", "getReviews"], ["POST", "createReview"], ["PATCH", "updateReview"]])],
  ["/reviews/{id}", new Map([["GET", "getReviewById"], ["PATCH", "updateReview"], ["DELETE", "deleteReview"]])],
  ["/properties/{propertyId}/reviews", new Map([["GET", "getPublicReviews"]])],
  ["/reviews/{id}/domits-private-feedback", new Map([["GET", "getPrivateFeedback"]])],
  ["/reviews/{id}/response", new Map([
    ["POST", "saveHostResponse"],
    ["PATCH", "saveHostResponse"],
    ["DELETE", "deleteReviewResponse"],
  ])],
  ["/reviews/{id}/response/publish", new Map([["POST", "saveHostResponse"]])],
  ["/reviews/{id}/publish", new Map([["POST", "publishReview"]])],
]);

const headers = {
  ...responseHeaders,
  "Content-Type": "application/json",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

const jsonResponse = (statusCode, message, extraHeaders = {}) => ({
  statusCode,
  headers: { ...headers, ...extraHeaders },
  body: JSON.stringify({ message }),
});

export const handler = async (event) => {
  try {
    const method = event?.httpMethod;
    const resourceRoutes = routes.get(event?.resource);

    if (!resourceRoutes) return jsonResponse(404, "Route not found.");

    const allowedMethods = [...resourceRoutes.keys(), "OPTIONS"].join(",");
    if (method === "OPTIONS") {
      return {
        statusCode: 200,
        headers: { ...headers, "Access-Control-Allow-Methods": allowedMethods },
        body: "",
      };
    }

    const action = resourceRoutes.get(method);
    if (!action) {
      return jsonResponse(405, "Method not supported for this resource.", { Allow: allowedMethods });
    }

    controller ??= new Controller();

    if (typeof controller[action] !== "function") {
      console.error("ReviewSystem controller method is not implemented:", action);
      return jsonResponse(500, "Internal Server Error");
    }

    const result = await controller[action](event);
    return {
      ...result,
      headers: { ...result.headers, ...headers },
    };
  } catch (error) {
    console.error("ReviewSystem handler failed:", error);
    return jsonResponse(500, "Internal Server Error");
  }
};
