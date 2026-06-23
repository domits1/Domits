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

const notFoundResponse = () => ({ statusCode: 404, response: { error: "NOT_FOUND", message: "Not Found" } });

const getAutomationRoute = (event) => {
  const segments = String(event?.path || event?.rawPath || "").split("/").filter(Boolean);
  const rootIndex = segments.lastIndexOf("automations");
  return rootIndex === -1 ? null : segments.slice(rootIndex + 1);
};

const routeDefinitions = [
  { method: "GET", matches: (route) => route.length === 0, handle: (event) => controller.list(event) },
  { method: "POST", matches: (route) => route.length === 0, handle: (event) => controller.create(event) },
  {
    method: "POST",
    matches: (route) => route.length === 1 && route[0] === "preview",
    handle: (event) => controller.preview(event),
  },
  {
    method: "GET",
    matches: (route) => route.length === 1 && route[0] === "health",
    handle: (event) => controller.health(event),
  },
  {
    method: "GET",
    matches: (route) => route.length === 1,
    handle: (event, route) => controller.get(event, route[0]),
  },
  {
    method: "PATCH",
    matches: (route) => route.length === 1,
    handle: (event, route) => controller.update(event, route[0]),
  },
  {
    method: "POST",
    matches: (route) => route.length === 2 && route[1] === "activate",
    handle: (event, route) => controller.activate(event, route[0]),
  },
  {
    method: "POST",
    matches: (route) => route.length === 2 && route[1] === "pause",
    handle: (event, route) => controller.pause(event, route[0]),
  },
  {
    method: "POST",
    matches: (route) => route.length === 2 && route[1] === "preview",
    handle: (event, route) => controller.preview(event, route[0]),
  },
  {
    method: "GET",
    matches: (route) => route.length === 2 && route[1] === "deliveries",
    handle: (event, route) => controller.deliveries(event, route[0]),
  },
];

const findRouteDefinition = (method, route) =>
  routeDefinitions.find((definition) => definition.method === method && definition.matches(route));

const routeHttpRequest = async (event) => {
  const method = event?.httpMethod || event?.requestContext?.http?.method;
  if (method === "OPTIONS") return { statusCode: 200, response: null };

  const route = getAutomationRoute(event);
  if (!route) return notFoundResponse();

  const definition = findRouteDefinition(method, route);
  return definition ? definition.handle(event, route) : notFoundResponse();
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
