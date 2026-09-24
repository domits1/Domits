import ReviewController from "./controller/reviewController.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

let controller = null;

// Review: Normalizes API Gateway path variants before route matching.
const normalizePath = (event) => {
  const rawPath = String(event.rawPath || event.path || event.resource || "");
  let pathEnd = rawPath.length;

  while (pathEnd > 1 && rawPath[pathEnd - 1] === "/") {
    pathEnd -= 1;
  }

  return rawPath.slice(0, pathEnd) || "/";
};

const getReviewIdFromPath = (event) => {
  // Review: Restores the review id when API Gateway proxy routing does not supply path parameters.
  if (event.pathParameters?.id) return event.pathParameters.id;

  const match = /^\/reviews\/([^/]+)$/.exec(normalizePath(event));
  return match?.[1] || null;
};

const withReviewId = (event) => {
  const reviewId = getReviewIdFromPath(event);

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

export const handler = async (event) => {
  // Review: Routes collection and detail requests through one ReviewSystem Lambda entry point.
  if (!controller) {
    controller = new ReviewController();
  }

  if (event.httpMethod === "OPTIONS") {
    return controller.options();
  }

  const routedEvent = withReviewId(event);

  if (event.httpMethod === "POST" && isReviewsCollectionPath(event)) {
    return controller.create(routedEvent);
  }

  if (event.httpMethod === "GET" && isReviewsCollectionPath(event)) {
    return controller.get(routedEvent);
  }

  if (event.httpMethod === "GET" && isReviewDetailPath(event)) {
    return controller.getById(routedEvent);
  }

  if (event.httpMethod === "PATCH" && isReviewDetailPath(event)) {
    return controller.update(routedEvent);
  }

  return {
    statusCode: 404,
    headers: responseHeaders,
    body: JSON.stringify({ message: "Route not found." }),
  };
};
