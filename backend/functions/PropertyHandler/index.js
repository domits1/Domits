import { PropertyController } from "./controller/propertyController.js";

let controller = new PropertyController();

const notFound = (body) => ({
  statusCode: 404,
  body,
});

const isPath = (event, route) => event.resource === route || event.path === route;

const handlePost = async (event) => {
  if (isPath(event, "/property/images/presign")) {
    return controller.createImageUploadUrls(event);
  }
  if (isPath(event, "/property/images/confirm")) {
    return controller.confirmImageUploads(event);
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
  return controller.activateProperty(event);
};

const hostDashboardHandlers = {
  all: (event) => controller.getFullOwnedProperties(event),
  single: (event) => controller.getFullOwnedPropertyById(event),
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
  const subResource = event.pathParameters?.subResource;
  if (event.resource === "/property/hostDashboard/{subResource}") {
    const handler = hostDashboardHandlers[subResource];
    return handler
      ? handler(event)
      : notFound("Sub-resource for '/property/hostDashboard' not found.");
  }

  if (event.resource === "/property/bookingEngine/{subResource}") {
    const handler = bookingEngineHandlers[subResource];
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
