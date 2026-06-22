import AutomationRepository from "./data/automationRepository.js";
import BookingContextRepository from "./data/bookingContextRepository.js";
import DeliveryRepository from "./data/deliveryRepository.js";
import OutboxRepository from "./data/outboxRepository.js";
import SchemaRepository from "./data/schemaRepository.js";
import AutomationService from "./business/automationService.js";
import SchedulingService from "./business/schedulingService.js";
import UnifiedMessagingClient from "./business/unifiedMessagingClient.js";
import DeliveryWorker from "./worker/deliveryWorker.js";
import AutomationController from "./controller/automationController.js";
import SchemaGuard from "./business/schemaGuard.js";

const automationRepository = new AutomationRepository();
const bookingContextRepository = new BookingContextRepository();
const deliveryRepository = new DeliveryRepository();
const outboxRepository = new OutboxRepository();
const schemaGuard = new SchemaGuard(new SchemaRepository());
const automationService = new AutomationService({ automationRepository, deliveryRepository, bookingContextRepository });
const schedulingService = new SchedulingService({
  outboxRepository,
  automationRepository,
  deliveryRepository,
  bookingContextRepository,
});
const deliveryWorker = new DeliveryWorker({
  deliveryRepository,
  automationRepository,
  bookingContextRepository,
  unifiedMessagingClient: new UnifiedMessagingClient(),
});
const controller = new AutomationController(automationService, schemaGuard);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};

const createResponse = ({ statusCode = 200, response }) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(response),
});

const routeHttpRequest = async (event) => {
  const method = event?.httpMethod || event?.requestContext?.http?.method;
  if (method === "OPTIONS") return { statusCode: 200, response: null };

  const segments = String(event?.path || event?.rawPath || "").split("/").filter(Boolean);
  const rootIndex = segments.lastIndexOf("automations");
  const route = rootIndex === -1 ? [] : segments.slice(rootIndex + 1);

  if (method === "GET" && route.length === 0) return controller.list(event);
  if (method === "POST" && route.length === 0) return controller.create(event);
  if (method === "POST" && route[0] === "preview") return controller.preview(event);
  if (method === "GET" && route[0] === "health" && route.length === 1) return controller.health(event);
  if (method === "GET" && route.length === 1) return controller.get(event, route[0]);
  if (method === "PATCH" && route.length === 1) return controller.update(event, route[0]);
  if (method === "POST" && route[1] === "activate") return controller.activate(event, route[0]);
  if (method === "POST" && route[1] === "pause") return controller.pause(event, route[0]);
  if (method === "POST" && route[1] === "preview") return controller.preview(event, route[0]);
  if (method === "GET" && route[1] === "deliveries") return controller.deliveries(event, route[0]);
  return { statusCode: 404, response: { error: "NOT_FOUND", message: "Not Found" } };
};

export const handler = async (event) => {
  try {
    if (event?.action === "PROCESS_BOOKING_PAID_OUTBOX") {
      await schemaGuard.assertReady();
      return createResponse({ statusCode: 200, response: await schedulingService.processOutbox(event.detail || {}) });
    }
    if (event?.action === "PROCESS_DUE_DELIVERIES") {
      await schemaGuard.assertReady();
      return createResponse({ statusCode: 200, response: await deliveryWorker.processDue(event.detail || {}) });
    }
    return createResponse(await routeHttpRequest(event));
  } catch (error) {
    console.error("AutomatedMessaging request failed", {
      code: error?.code || error?.name || "INTERNAL_ERROR",
      statusCode: error?.statusCode || 500,
    });
    return createResponse({
      statusCode: error?.statusCode || 500,
      response: {
        error: error?.code || "INTERNAL_ERROR",
        message: error?.statusCode ? error.message : "Internal Server Error",
        ...(error?.details ? { details: error.details } : {}),
      },
    });
  }
};
