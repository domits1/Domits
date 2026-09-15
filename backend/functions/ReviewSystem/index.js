import ReviewController from "./controller/reviewController.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

let controller = null;

const normalizePath = (event) => {
  const rawPath = event.rawPath || event.path || event.resource || "";
  return rawPath.replace(/\/+$/, "") || "/";
};

const getReviewIdFromPath = (event) => {
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
      ...(event.pathParameters || {}),
      id: reviewId,
    },
  };
};

const isReviewsCollectionPath = (event) => normalizePath(event) === "/reviews";
const isReviewDetailPath = (event) => Boolean(getReviewIdFromPath(event));

export const handler = async (event) => {
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
