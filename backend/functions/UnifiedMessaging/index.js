import MessageController from "./controller/messageController.js";
import IntegrationController from "./controller/integrationController.js";
import IngestionController from "./controller/ingestionController.js";
import WhatsAppWebhookController from "./controller/whatsappWebhookController.js";
import PreferencesCenterController from "./controller/preferencesCenterController.js";

const messageController = new MessageController();
const integrationController = new IntegrationController();
const ingestionController = new IngestionController();
const whatsAppWebhookController = new WhatsAppWebhookController();
const preferencesCenterController = new PreferencesCenterController();

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
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/integrations/holidu/status"),
    handle: (event) => integrationController.checkHoliduStatus(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/integrations/holidu/disconnect"),
    handle: (event) => integrationController.disconnectHolidu(event),
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
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/messaging-preferences"),
    handle: (event) => preferencesCenterController.getPreferences(event),
  },
  {
    matches: (method, path) => method === "PUT" && String(path || "").endsWith("/messaging-preferences"),
    handle: (event) => preferencesCenterController.upsertPreferences(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/messaging-templates"),
    handle: (event) => preferencesCenterController.listTemplates(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/messaging-templates"),
    handle: (event) => preferencesCenterController.createTemplate(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").includes("/messaging-templates/") &&
      String(path || "").endsWith("/render"),
    handle: (event) => preferencesCenterController.renderTemplate(event),
  },
  {
    matches: (method, path) => method === "PATCH" && String(path || "").includes("/messaging-templates/"),
    handle: (event) => preferencesCenterController.updateTemplate(event),
  },
  {
    matches: (method, path) =>
      method === "POST" &&
      String(path || "").includes("/messaging-templates/") &&
      String(path || "").endsWith("/duplicate"),
    handle: (event) => preferencesCenterController.duplicateTemplate(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/messaging-auto-replies"),
    handle: (event) => preferencesCenterController.listAutoReplyRules(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/messaging-auto-replies"),
    handle: (event) => preferencesCenterController.createAutoReplyRule(event),
  },
  {
    matches: (method, path) => method === "PATCH" && String(path || "").includes("/messaging-auto-replies/"),
    handle: (event) => preferencesCenterController.updateAutoReplyRule(event),
  },
  {
    matches: (method, path) => method === "GET" && String(path || "").endsWith("/messaging-scheduler-rules"),
    handle: (event) => preferencesCenterController.listSchedulerRules(event),
  },
  {
    matches: (method, path) => method === "POST" && String(path || "").endsWith("/messaging-scheduler-rules"),
    handle: (event) => preferencesCenterController.createSchedulerRule(event),
  },
  {
    matches: (method, path) => method === "PATCH" && String(path || "").includes("/messaging-scheduler-rules/"),
    handle: (event) => preferencesCenterController.updateSchedulerRule(event),
  },
  {
    matches: (method, path) => method === "PUT" && String(path || "").endsWith("/messaging-reservation-pauses"),
    handle: (event) => preferencesCenterController.setReservationAutomationPause(event),
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
