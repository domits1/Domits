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

const addDomitsPrivateFeedbackPathParameters = (event) => ({
  ...event,
  pathParameters: {
    ...(event.pathParameters || {}),
    id: getDomitsPrivateFeedbackReviewIdFromPath(event),
  },
});

const routeEvent = (event) => withReviewResponsePathParameters(withPropertyReviewPathParameters(withReviewId(event)));

const ROUTES = [
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
  const reviewController = getController();

  if (event.httpMethod === "OPTIONS") {
    return reviewController.options();
  }

  const route = ROUTES.find((candidate) => candidate.method === event.httpMethod && candidate.matches(event));

  if (!route) return notFoundResponse();

  return route.handle(reviewController, route.prepare(event));
};
