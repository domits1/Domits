import MessageController from "./controller/messageController.js";
import IntegrationController from "./controller/integrationController.js";
import IngestionController from "./controller/ingestionController.js";
import WhatsAppWebhookController from "./controller/whatsappWebhookController.js";

const messageController = new MessageController();
const integrationController = new IntegrationController();
const ingestionController = new IngestionController();
const whatsAppWebhookController = new WhatsAppWebhookController();

const notFound = { statusCode: 404, response: "Not Found" };
const internalError = { statusCode: 500, response: "Internal Server Error" };
const nestedIntegrationRoutePattern = /\/integrations\/[^/]+\/.+/;

const pathIncludesOrEndsWith = (path, suffix) => {
  const normalizedPath = String(path || "");
  return normalizedPath.endsWith(suffix) || normalizedPath.includes(suffix);
};

const hasNestedIntegrationSubroute = (path) => nestedIntegrationRoutePattern.exec(String(path || ""));

const routeDefinitions = [
  {
    matches: (method, path) => method === "GET" && pathIncludesOrEndsWith(path, "/webhooks/whatsapp"),
    handle: (event) => whatsAppWebhookController.verifyWebhook(event),
  },
  {
    matches: (method, path) => method === "POST" && pathIncludesOrEndsWith(path, "/webhooks/whatsapp"),
    handle: (event) => whatsAppWebhookController.handleWebhookEvent(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/whatsapp/connect/start"),
    handle: (event) => integrationController.startWhatsAppConnect(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/holidu/connect"),
    handle: (event) => integrationController.connectHolidu(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/connect"),
    handle: (event) => integrationController.connectChannex(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/holidu/status"),
    handle: (event) => integrationController.checkHoliduStatus(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/status"),
    handle: (event) => integrationController.checkChannexStatus(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/properties"),
    handle: (event) => integrationController.listChannexProperties(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/channex/room-types"),
    handle: (event) => integrationController.listChannexRoomTypes(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/properties"),
    handle: (event) => integrationController.linkChannexProperty(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/holidu/disconnect"),
    handle: (event) => integrationController.disconnectHolidu(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/channex/disconnect"),
    handle: (event) => integrationController.disconnectChannex(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/whatsapp/connect/complete"),
    handle: (event) => integrationController.completeWhatsAppConnect(event),
  },
  {
    matches: (method, path) =>
      method === "POST" && String(path || "").endsWith("/integrations/whatsapp/connect/select-number"),
    handle: (event) => integrationController.selectWhatsAppNumber(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/whatsapp/disconnect"),
    handle: (event) => integrationController.disconnectWhatsApp(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/whatsapp/token/health"),
    handle: (event) => integrationController.checkWhatsAppTokenHealth(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/whatsapp/token/refresh"),
    handle: (event) => integrationController.refreshWhatsAppToken(event),
  },
  {
    matches: (method, path) => method === "POST" && pathIncludesOrEndsWith(path, "/send"),
    handle: (event) => messageController.sendMessage(event),
  },
  {
    matches: (method, path) => method === "GET" && pathIncludesOrEndsWith(path, "/threads"),
    handle: (event) => messageController.getThreads(event),
  },
  {
    matches: (method, path) => method === "GET" && pathIncludesOrEndsWith(path, "/messages"),
    handle: (event) => messageController.getMessages(event),
  },
  {
    matches: (method, path) =>
      method === "POST" && String(path || "").includes("/integrations/") && String(path || "").endsWith("/ingest/messages"),
    handle: (event) => ingestionController.ingestMessages(event),
  },
  {
    matches: (method, path) =>
      method === "POST" && pathIncludesOrEndsWith(path, "/integrations") && !hasNestedIntegrationSubroute(path),
    handle: (event) => integrationController.createIntegration(event),
  },
  {
    matches: (method, path) =>
      method === "GET" && pathIncludesOrEndsWith(path, "/integrations") && !hasNestedIntegrationSubroute(path),
    handle: (event) => integrationController.listIntegrations(event),
  },
  {
    matches: (method, path) => method === "PATCH" && String(path || "").includes("/integrations/"),
    handle: (event) => integrationController.updateIntegration(event),
  },
  {
    matches: (method, path) =>
      method === "GET" && String(path || "").includes("/integrations/") && String(path || "").endsWith("/logs"),
    handle: (event) => integrationController.getIntegrationLogs(event),
  },
  {
    matches: (method, path) =>
      method === "POST" && String(path || "").includes("/integrations/") && String(path || "").endsWith("/properties"),
    handle: (event) => integrationController.upsertIntegrationProperty(event),
  },
  {
    matches: (method, path) =>
      method === "GET" && String(path || "").includes("/integrations/") && String(path || "").endsWith("/properties"),
    handle: (event) => integrationController.listIntegrationProperties(event),
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
    handle: (event) => integrationController.triggerReservationsSync(event),
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
  routeDefinitions.find((route) => route.matches(httpMethod, path))?.handle || null;

export const handler = async (event) => {
  const { httpMethod, path } = event;

  console.log(
    "Event received:",
    JSON.stringify({
      httpMethod,
      path,
      queryStringParameters: event.queryStringParameters,
    })
  );

  try {
    const route = `${httpMethod}:${path}`;
    const routeHandler = findRouteHandler(httpMethod, path);

    if (!routeHandler) {
      console.log("No matching route for:", route);
      return {
        statusCode: notFound.statusCode,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
        body: JSON.stringify(notFound.response),
      };
    }

    const returnedResponse = await routeHandler(event);
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      ...(returnedResponse?.headers || {}),
    };

    let responseBody;
    if (returnedResponse?.rawBody === undefined) {
      responseBody = JSON.stringify(returnedResponse?.response);
    } else {
      responseBody = returnedResponse.rawBody;
    }

    return {
      statusCode: returnedResponse?.statusCode || 200,
      headers,
      body: responseBody,
    };
  } catch (error) {
    console.error("Error in handler:", error);
    return {
      statusCode: internalError.statusCode,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
      body: JSON.stringify(internalError.response),
    };
  }
};
