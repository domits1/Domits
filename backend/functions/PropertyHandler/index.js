import { PropertyController } from "./controller/propertyController.js";

let controller = new PropertyController();

const notFound = (body) => ({
  statusCode: 404,
  body,
});

const isPath = (event, route) => event.resource === route || event.path === route;

const getSubResource = (event, resourceTemplate, pathPrefix) => {
  if (event.resource === resourceTemplate) {
    return event.pathParameters?.subResource;
  }

  const path = String(event.path || "");
  if (!path.startsWith(pathPrefix)) {
    return undefined;
  }

  return path.slice(pathPrefix.length).split("/").filter(Boolean)[0];
};

const handlePost = async (event) => {
  if (isPath(event, "/property/images/presign")) {
    return controller.createImageUploadUrls(event);
  }
  if (isPath(event, "/property/images/confirm")) {
    return controller.confirmImageUploads(event);
  }
  if (isPath(event, "/property/website/draft")) {
    return controller.upsertWebsiteDraft(event);
  }
  if (isPath(event, "/property/draft")) {
    return controller.createDraft(event);
  }
  return controller.create(event);
};

const handlePatch = async (event) => {
  if (isPath(event, "/property/images/order")) {
    return controller.updateImageOrder(event);
  }
  if (isPath(event, "/property/overview")) {
    return controller.updatePropertyOverview(event);
  }
  if (isPath(event, "/property/calendar/overrides")) {
    return controller.updatePropertyCalendarOverrides(event);
  }
  return controller.activateProperty(event);
};

const hostDashboardHandlers = {
  all: (event) => controller.getFullOwnedProperties(event),
  single: (event) => controller.getFullOwnedPropertyById(event),
  websiteDrafts: (event) => controller.getWebsiteDrafts(event),
  websiteDraft: (event) => controller.getWebsiteDraftByPropertyId(event),
};

const bookingEngineHandlers = {
  byType: (event) => controller.getActivePropertiesCardByType(event),
  all: (event) => controller.getActivePropertiesCard(event),
  byCountry: (event) => controller.getActivePropertiesCardByCountry(event),
  byHostId: (event) => controller.getActivePropertiesCardByHostId(event),
  set: (event) => controller.getActivePropertiesCardById(event),
  listingDetails: (event) => controller.getFullActivePropertyById(event),
  booking: (event) => controller.getFullPropertyByBookingId(event),
};

const handleGet = async (event) => {
  if (isPath(event, "/property/website/preview")) {
    return controller.getWebsitePreviewByDraftId(event);
  }
  if (isPath(event, "/property/website/drafts")) {
    return controller.getWebsiteDrafts(event);
  }
  if (isPath(event, "/property/website/draft")) {
    return controller.getWebsiteDraftByPropertyId(event);
  }
  if (isPath(event, "/property/calendar/overrides")) {
    return controller.getPropertyCalendarOverrides(event);
  }

  const hostDashboardSubResource = getSubResource(
    event,
    "/property/hostDashboard/{subResource}",
    "/property/hostDashboard/"
  );
  if (hostDashboardSubResource) {
    const handler = hostDashboardHandlers[hostDashboardSubResource];
    return handler
      ? handler(event)
      : notFound("Sub-resource for '/property/hostDashboard' not found.");
  }

  const bookingEngineSubResource = getSubResource(
    event,
    "/property/bookingEngine/{subResource}",
    "/property/bookingEngine/"
  );
  if (bookingEngineSubResource) {
    const handler = bookingEngineHandlers[bookingEngineSubResource];
    return handler
      ? handler(event)
      : notFound("Sub-resource for '/property/bookingEngine' not found.");
  }

  return notFound("Path not found.");
};

const handleDelete = async (event) => {
  if (isPath(event, "/property/images")) {
    return controller.deletePropertyImage(event);
  }
  if (isPath(event, "/property/website/draft")) {
    return controller.deleteWebsiteDraft(event);
  }
  if (isPath(event, "/property/draft")) {
    return controller.deleteDraft(event);
  }
  return controller.delete(event);
};

const methodHandlers = {
  POST: handlePost,
  PATCH: handlePatch,
  GET: handleGet,
  DELETE: handleDelete,
};

export const handler = async (event) => {
  if (!controller) {
    controller = new PropertyController();
  }

  try {
    const methodHandler = methodHandlers[event.httpMethod];
    if (!methodHandler) {
      return notFound("Method not found.");
    }
    return await methodHandler(event);
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: "Something went wrong, please contact support.",
    };
  }
};
