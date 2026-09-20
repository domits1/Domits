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

const getReviewResponseRouteFromPath = (event) => {
  const match = /^\/reviews\/([^/]+)\/response(?:\/(publish))?$/.exec(normalizePath(event));

  if (!match) return null;

  return {
    reviewId: match[1],
    action: match[2] || "response",
  };
};

const getDomitsPrivateFeedbackReviewIdFromPath = (event) => {
  const match = /^\/reviews\/([^/]+)\/domits-private-feedback$/.exec(normalizePath(event));
  return match?.[1] || null;
};

const getPropertyIdFromReviewsPath = (event) => {
  if (event.pathParameters?.propertyId) return event.pathParameters.propertyId;

  const match = /^\/properties\/([^/]+)\/reviews$/.exec(normalizePath(event));
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

const withReviewResponsePathParameters = (event) => {
  const responseRoute = getReviewResponseRouteFromPath(event);

  if (!responseRoute) return event;

  return {
    ...event,
    pathParameters: {
      ...(event.pathParameters || {}),
      id: responseRoute.reviewId,
    },
  };
};

const withPropertyReviewPathParameters = (event) => {
  const propertyId = getPropertyIdFromReviewsPath(event);

  if (!propertyId) return event;

  return {
    ...event,
    pathParameters: {
      ...(event.pathParameters || {}),
      propertyId,
    },
  };
};

const isReviewsCollectionPath = (event) => normalizePath(event) === "/reviews";
const isPropertyReviewsPath = (event) => Boolean(getPropertyIdFromReviewsPath(event));
const isReviewDetailPath = (event) => Boolean(getReviewIdFromPath(event));

export const handler = async (event) => {
  if (!controller) {
    controller = new ReviewController();
  }

  if (event.httpMethod === "OPTIONS") {
    return controller.options();
  }

  const responseRoute = getReviewResponseRouteFromPath(event);
  const domitsPrivateFeedbackReviewId = getDomitsPrivateFeedbackReviewIdFromPath(event);
  const routedEvent = withReviewResponsePathParameters(withPropertyReviewPathParameters(withReviewId(event)));

  if (event.httpMethod === "GET" && domitsPrivateFeedbackReviewId) {
    return controller.getDomitsPrivateFeedback({
      ...routedEvent,
      pathParameters: {
        ...(routedEvent.pathParameters || {}),
        id: domitsPrivateFeedbackReviewId,
      },
    });
  }

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

  if (event.httpMethod === "POST" && isReviewsCollectionPath(event)) {
    return controller.create(routedEvent);
  }

  if (event.httpMethod === "GET" && (isReviewsCollectionPath(event) || isPropertyReviewsPath(event))) {
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
