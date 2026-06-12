import { handleChannelManagementEvent } from "./.shared/channelManagement/handler/channelManagementHandler.js";
import IngestionController from "./controller/ingestionController.js";
import IntegrationController from "./controller/integrationController.js";
import MessageController from "./controller/messageController.js";
import WhatsAppWebhookController from "./controller/whatsappWebhookController.js";

const messageController = new MessageController();
const integrationController = new IntegrationController();
const ingestionController = new IngestionController();
const whatsAppWebhookController = new WhatsAppWebhookController();
const notFound = { statusCode: 404, response: "Not Found" };
const internalError = { statusCode: 500, response: "Internal Server Error" };
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,x-domits-internal-token",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};

const pathIncludesOrEndsWith = (path, suffix) => {
  const normalizedPath = String(path || "");
  return normalizedPath.endsWith(suffix) || normalizedPath.includes(suffix);
};

const hasNestedIntegrationSubroute = (path) => {
  const normalizedPath = String(path || "");
  const integrationPrefixIndex = normalizedPath.indexOf("/integrations/");
  if (integrationPrefixIndex === -1) return false;

  const integrationNameStart =
    integrationPrefixIndex + "/integrations/".length;
  const nestedSlashIndex = normalizedPath.indexOf(
    "/",
    integrationNameStart
  );
  return (
    nestedSlashIndex > integrationNameStart &&
    nestedSlashIndex < normalizedPath.length - 1
  );
};

const createLambdaResponse = (returnedResponse) => ({
  statusCode: returnedResponse?.statusCode || 200,
  headers: {
    ...corsHeaders,
    ...(returnedResponse?.headers || {}),
  },
  body:
    returnedResponse?.rawBody === undefined
      ? JSON.stringify(returnedResponse?.response)
      : returnedResponse.rawBody,
});

const routeDefinitions = [
  {
    matches: (method, path) =>
      method === "GET" &&
      pathIncludesOrEndsWith(path, "/webhooks/whatsapp"),
    handle: (event) => whatsAppWebhookController.verifyWebhook(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      pathIncludesOrEndsWith(path, "/webhooks/whatsapp"),
    handle: (event) =>
      whatsAppWebhookController.handleWebhookEvent(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").endsWith(
        "/integrations/whatsapp/connect/start"
      ),
    handle: (event) => integrationController.startWhatsAppConnect(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").endsWith(
        "/integrations/whatsapp/connect/complete"
      ),
    handle: (event) =>
      integrationController.completeWhatsAppConnect(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").endsWith(
        "/integrations/whatsapp/connect/select-number"
      ),
    handle: (event) => integrationController.selectWhatsAppNumber(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").endsWith("/integrations/whatsapp/disconnect"),
    handle: (event) => integrationController.disconnectWhatsApp(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").endsWith(
        "/integrations/whatsapp/token/health"
      ),
    handle: (event) =>
      integrationController.checkWhatsAppTokenHealth(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").endsWith(
        "/integrations/whatsapp/token/refresh"
      ),
    handle: (event) => integrationController.refreshWhatsAppToken(event),
  },
  {
    matches: (method, path) =>
      method === "POST" && pathIncludesOrEndsWith(path, "/send"),
    handle: (event) => messageController.sendMessage(event),
  },
  {
    matches: (method, path) =>
      method === "GET" && pathIncludesOrEndsWith(path, "/threads"),
    handle: (event) => messageController.getThreads(event),
  },
  {
    matches: (method, path) =>
      method === "GET" && pathIncludesOrEndsWith(path, "/messages"),
    handle: (event) => messageController.getMessages(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").includes("/integrations/") &&
      String(path || "").endsWith("/ingest/messages"),
    handle: (event) => ingestionController.ingestMessages(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      pathIncludesOrEndsWith(path, "/integrations") &&
      !hasNestedIntegrationSubroute(path),
    handle: (event) => integrationController.createIntegration(event),
  },
  {
    matches: (method, path) =>
      method === "GET" &&
      pathIncludesOrEndsWith(path, "/integrations") &&
      !hasNestedIntegrationSubroute(path),
    handle: (event) => integrationController.listIntegrations(event),
  },
  {
    matches: (method, path) =>
      method === "PATCH" &&
      String(path || "").includes("/integrations/"),
    handle: (event) => integrationController.updateIntegration(event),
  },
  {
    matches: (method, path) =>
      method === "GET" &&
      String(path || "").includes("/integrations/") &&
      String(path || "").endsWith("/logs"),
    handle: (event) => integrationController.getIntegrationLogs(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").includes("/integrations/") &&
      String(path || "").endsWith("/properties"),
    handle: (event) =>
      integrationController.upsertIntegrationProperty(event),
  },
  {
    matches: (method, path) =>
      method === "GET" &&
      String(path || "").includes("/integrations/") &&
      String(path || "").endsWith("/properties"),
    handle: (event) =>
      integrationController.listIntegrationProperties(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").includes("/integrations/") &&
      String(path || "").endsWith("/sync/messages"),
    handle: (event) => integrationController.triggerMessagesSync(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").includes("/integrations/") &&
      String(path || "").endsWith("/sync/reservations"),
    handle: (event) =>
      integrationController.triggerReservationsSync(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").includes("/integrations/") &&
      String(path || "").endsWith("/reservations/link"),
    handle: (event) => integrationController.linkReservation(event),
  },
];

const findRouteHandler = (httpMethod, path) =>
  routeDefinitions.find((route) => route.matches(httpMethod, path))
    ?.handle || null;

export const handler = async (event) => {
  const channelResponse = await handleChannelManagementEvent(event);
  if (channelResponse) return channelResponse;

  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: corsHeaders, body: "" };
    }

    const routeHandler = findRouteHandler(event.httpMethod, event.path);
    if (!routeHandler) return createLambdaResponse(notFound);

    return createLambdaResponse(await routeHandler(event));
  } catch (error) {
    console.error("Error in handler:", error);
    return createLambdaResponse(internalError);
  }
};
