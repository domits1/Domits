import ReviewController from "./controller/reviewController.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

let controller = null;

// Review: Normalizes API Gateway path variants so every review route can share one matcher.
const normalizePath = (event) => {
  const rawPath = event.rawPath || event.path || event.resource || "";
  let normalizedPath = rawPath;
  while (normalizedPath.endsWith("/")) {
    normalizedPath = normalizedPath.slice(0, -1);
  }
  return normalizedPath || "/";
};

const getPathParts = (event) => normalizePath(event).split("/");

const getReviewIdFromPath = (event) => {
  // Review: Extracts detail review ids when API Gateway did not provide path parameters.
  if (event.pathParameters?.id) return event.pathParameters.id;

  const pathParts = getPathParts(event);
  return pathParts.length === 3 && pathParts[1] === "reviews" ? pathParts[2] : null;
};

const getReviewResponseRouteFromPath = (event) => {
  // Review: Matches draft, publish, edit, and delete routes for one host response.
  const pathParts = getPathParts(event);
  const isResponseRoute =
    (pathParts.length === 4 || pathParts.length === 5) &&
    pathParts[1] === "reviews" &&
    pathParts[3] === "response";

  if (!isResponseRoute) return null;

  return { reviewId: pathParts[2], action: pathParts[4] || "response" };
};

const getDomitsPrivateFeedbackReviewIdFromPath = (event) => {
  // Review: Detects internal Domits private feedback reads for a single review.
  const pathParts = getPathParts(event);
  return pathParts.length === 4 && pathParts[1] === "reviews" && pathParts[3] === "domits-private-feedback"
    ? pathParts[2]
    : null;
};

const getPropertyIdFromReviewsPath = (event) => {
  // Review: Extracts property ids for public listing review requests.
  if (event.pathParameters?.propertyId) return event.pathParameters.propertyId;

  const pathParts = getPathParts(event);
  return pathParts.length === 4 && pathParts[1] === "properties" && pathParts[3] === "reviews"
    ? pathParts[2]
    : null;
};

const withReviewId = (event) => {
  // Review: Adds a resolved review id back onto the event before controller handling.
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

const withReviewResponsePathParameters = (event) => {
  // Review: Adds response route ids back onto the event before host response handling.
  const responseRoute = getReviewResponseRouteFromPath(event);

  if (!responseRoute) return event;

  return {
    ...event,
    pathParameters: {
      ...event.pathParameters,
      id: responseRoute.reviewId,
    },
  };
};

const withPropertyReviewPathParameters = (event) => {
  // Review: Adds property ids back onto the event before public review handling.
  const propertyId = getPropertyIdFromReviewsPath(event);

  if (!propertyId) return event;

  return {
    ...event,
    pathParameters: {
      ...event.pathParameters,
      propertyId,
    },
  };
};

const isReviewsCollectionPath = (event) => normalizePath(event) === "/reviews";
const isPropertyReviewsPath = (event) => Boolean(getPropertyIdFromReviewsPath(event));
const isReviewDetailPath = (event) => Boolean(getReviewIdFromPath(event));
const getModerationReviewId = (event) => {
  const pathParts = getPathParts(event);
  return pathParts.length === 4 && pathParts[1] === "reviews" && pathParts[3] === "moderate"
    ? pathParts[2]
    : null;
};

const addDomitsPrivateFeedbackPathParameters = (event) => ({
  ...event,
  pathParameters: {
    ...event.pathParameters,
    id: getDomitsPrivateFeedbackReviewIdFromPath(event),
  },
});

const routeEvent = (event) => withReviewResponsePathParameters(withPropertyReviewPathParameters(withReviewId(event)));

const ROUTES = [
  // Review: Ordered route table for notification, moderation, response, collection, and detail endpoints.
  { method: "GET", matches: (event) => normalizePath(event) === "/reviews/notification-preferences", prepare: routeEvent,
    handle: (controller, event) => controller.notificationPreference(event) },
  { method: "PATCH", matches: (event) => normalizePath(event) === "/reviews/notification-preferences", prepare: routeEvent,
    handle: (controller, event) => controller.setNotificationPreference(event) },
  { method: "GET", matches: (event) => normalizePath(event) === "/reviews/moderation", prepare: routeEvent,
    handle: (controller, event) => controller.moderationQueue(event) },
  { method: "GET", matches: (event) => normalizePath(event) === "/reviews/domits-private-feedback", prepare: routeEvent,
    handle: (controller, event) => controller.getDomitsPrivateFeedbackInbox(event) },
  { method: "POST", matches: (event) => Boolean(getModerationReviewId(event)),
    prepare: (event) => ({ ...event, pathParameters: { ...event.pathParameters, id: getModerationReviewId(event) } }),
    handle: (controller, event) => controller.moderate(event) },
  {
    method: "GET",
    matches: (event) => Boolean(getDomitsPrivateFeedbackReviewIdFromPath(event)),
    prepare: (event) => addDomitsPrivateFeedbackPathParameters(routeEvent(event)),
    handle: (controller, event) => controller.getDomitsPrivateFeedback(event),
  },
  {
    method: "POST",
    matches: (event) => getReviewResponseRouteFromPath(event)?.action === "response",
    prepare: routeEvent,
    handle: (controller, event) => controller.saveDraftResponse(event),
  },
  {
    method: "POST",
    matches: (event) => getReviewResponseRouteFromPath(event)?.action === "publish",
    prepare: routeEvent,
    handle: (controller, event) => controller.publishResponse(event),
  },
  {
    method: "PATCH",
    matches: (event) => getReviewResponseRouteFromPath(event)?.action === "response",
    prepare: routeEvent,
    handle: (controller, event) => controller.editResponse(event),
  },
  {
    method: "DELETE",
    matches: (event) => getReviewResponseRouteFromPath(event)?.action === "response",
    prepare: routeEvent,
    handle: (controller, event) => controller.deleteResponse(event),
  },
  {
    method: "POST",
    matches: isReviewsCollectionPath,
    prepare: routeEvent,
    handle: (controller, event) => controller.create(event),
  },
  {
    method: "GET",
    matches: (event) => isReviewsCollectionPath(event) || isPropertyReviewsPath(event),
    prepare: routeEvent,
    handle: (controller, event) => controller.get(event),
  },
  {
    method: "GET",
    matches: isReviewDetailPath,
    prepare: routeEvent,
    handle: (controller, event) => controller.getById(event),
  },
  {
    method: "PATCH",
    matches: isReviewDetailPath,
    prepare: routeEvent,
    handle: (controller, event) => controller.update(event),
  },
];

const notFoundResponse = () => ({
  statusCode: 404,
  headers: responseHeaders,
  body: JSON.stringify({ message: "Route not found." }),
});

const getController = () => {
  if (!controller) {
    controller = new ReviewController();
  }

  return controller;
};

export const handler = async (event) => {
  // Review: Entry point that handles scheduled review work, CORS, and HTTP review routes.
  const reviewController = getController();

  if (event.action === "PROCESS_REVIEW_REQUESTS") {
    return reviewController.processReviewRequests(event.detail);
  }

  if (event.httpMethod === "OPTIONS") {
    return reviewController.options();
  }

  const route = ROUTES.find((candidate) => candidate.method === event.httpMethod && candidate.matches(event));

  if (!route) return notFoundResponse();

  return route.handle(reviewController, route.prepare(event));
};
