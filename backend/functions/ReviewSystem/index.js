import ReviewController from "./controller/reviewController.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

let controller = null;

// Review: Normalizes API Gateway path variants before route matching.
const normalizePath = (event) => {
  const rawPath = event.rawPath || event.path || event.resource || "";
  return rawPath.replace(/\/+$/, "") || "/";
};

const getReviewIdFromPath = (event) => {
  // Review: Restores the review id when API Gateway proxy routing does not supply path parameters.
  if (event.pathParameters?.id) return event.pathParameters.id;

  const match = /^\/reviews\/([^/]+)$/.exec(normalizePath(event));
  return match?.[1] || null;
};

const getReviewResponseRouteFromPath = (event) => {
  // Review: Matches draft, publish, edit, and delete routes for one host response.
  const match = /^\/reviews\/([^/]+)\/response(?:\/(publish))?$/.exec(normalizePath(event));
  return match ? { reviewId: match[1], action: match[2] || "response" } : null;
};

const withReviewId = (event) => {
  const reviewId = getReviewIdFromPath(event) || getReviewResponseRouteFromPath(event)?.reviewId;

  if (!reviewId) return event;

  return {
    ...event,
    pathParameters: {
      ...event.pathParameters,
      id: reviewId,
    },
  };
};

const isReviewsCollectionPath = (event) => normalizePath(event) === "/reviews";
const isReviewDetailPath = (event) => Boolean(getReviewIdFromPath(event));

const routeResponseRequest = (event, routedEvent, responseRoute) => {
  // Review: Routes host response actions separately to keep the Lambda entry point straightforward.
  if (event.httpMethod === "POST" && responseRoute?.action === "response") {
    return controller.saveDraftResponse(routedEvent);
  }
  if (event.httpMethod === "POST" && responseRoute?.action === "publish") {
    return controller.publishResponse(routedEvent);
  }
  if (event.httpMethod === "PATCH" && responseRoute?.action === "response") {
    return controller.editResponse(routedEvent);
  }
  if (event.httpMethod === "DELETE" && responseRoute?.action === "response") {
    return controller.deleteResponse(routedEvent);
  }
  return null;
};

const routeReviewRequest = (event, routedEvent) => {
  // Review: Routes review collection and detail operations after response routes are excluded.
  if (event.httpMethod === "POST" && isReviewsCollectionPath(event)) return controller.create(routedEvent);
  if (event.httpMethod === "GET" && isReviewsCollectionPath(event)) return controller.get(routedEvent);
  if (event.httpMethod === "GET" && isReviewDetailPath(event)) return controller.getById(routedEvent);
  if (event.httpMethod === "PATCH" && isReviewDetailPath(event)) return controller.update(routedEvent);
  return null;
};

export const handler = async (event) => {
  // Review: Routes collection and detail requests through one ReviewSystem Lambda entry point.
  if (!controller) {
    controller = new ReviewController();
  }

  if (event.httpMethod === "OPTIONS") {
    return controller.options();
  }

  const routedEvent = withReviewId(event);
  const responseRoute = getReviewResponseRouteFromPath(event);
  const responseResult = routeResponseRequest(event, routedEvent, responseRoute);

  if (responseResult) return responseResult;

  const reviewResult = routeReviewRequest(event, routedEvent);
  if (reviewResult) return reviewResult;

  return {
    statusCode: 404,
    headers: responseHeaders,
    body: JSON.stringify({ message: "Route not found." }),
  };
};
