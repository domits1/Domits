import MessageController from "./controller/messageController.js";
import IntegrationController from "./controller/integrationController.js";
import IngestionController from "./controller/ingestionController.js";
import WhatsAppWebhookController from "./controller/whatsappWebhookController.js";

const messageController = new MessageController();
const integrationController = new IntegrationController();
const ingestionController = new IngestionController();
const whatsAppWebhookController = new WhatsAppWebhookController();

export const handler = async (event) => {
  let returnedResponse = {};
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

    switch (true) {
      case httpMethod === "GET" && (path.endsWith("/webhooks/whatsapp") || path.includes("/webhooks/whatsapp")):
        returnedResponse = await whatsAppWebhookController.verifyWebhook(event);
        break;

      case httpMethod === "POST" && (path.endsWith("/webhooks/whatsapp") || path.includes("/webhooks/whatsapp")):
        returnedResponse = await whatsAppWebhookController.handleWebhookEvent(event);
        break;

      case httpMethod === "POST" && path.endsWith("/integrations/whatsapp/connect/start"):
        returnedResponse = await integrationController.startWhatsAppConnect(event);
        break;

      case httpMethod === "POST" && path.endsWith("/integrations/whatsapp/connect/complete"):
        returnedResponse = await integrationController.completeWhatsAppConnect(event);
        break;

      case httpMethod === "POST" && path.endsWith("/integrations/whatsapp/connect/select-number"):
        returnedResponse = await integrationController.selectWhatsAppNumber(event);
        break;

      case httpMethod === "POST" && path.endsWith("/integrations/whatsapp/disconnect"):
        returnedResponse = await integrationController.disconnectWhatsApp(event);
        break;

      case httpMethod === "POST" && (path.endsWith("/send") || path.includes("/send")):
        returnedResponse = await messageController.sendMessage(event);
        break;

      case httpMethod === "GET" && (path.endsWith("/threads") || path.includes("/threads")):
        returnedResponse = await messageController.getThreads(event);
        break;

      case httpMethod === "GET" && (path.endsWith("/messages") || path.includes("/messages")):
        returnedResponse = await messageController.getMessages(event);
        break;

      case httpMethod === "POST" && path.includes("/integrations/") && path.endsWith("/ingest/messages"):
        returnedResponse = await ingestionController.ingestMessages(event);
        break;

      case httpMethod === "POST" && (path.endsWith("/integrations") || path.includes("/integrations")):
        if (path.match(/\/integrations\/[^/]+\/.+/)) {
          returnedResponse = { statusCode: 404, response: "Not Found" };
        } else {
          returnedResponse = await integrationController.createIntegration(event);
        }
        break;

      case httpMethod === "GET" && (path.endsWith("/integrations") || path.includes("/integrations")):
        if (path.match(/\/integrations\/[^/]+\/.+/)) {
          returnedResponse = { statusCode: 404, response: "Not Found" };
        } else {
          returnedResponse = await integrationController.listIntegrations(event);
        }
        break;

      case httpMethod === "PATCH" && path.includes("/integrations/"):
        returnedResponse = await integrationController.updateIntegration(event);
        break;

      case httpMethod === "GET" && path.includes("/integrations/") && path.endsWith("/logs"):
        returnedResponse = await integrationController.getIntegrationLogs(event);
        break;

      case httpMethod === "POST" && path.includes("/integrations/") && path.endsWith("/properties"):
        returnedResponse = await integrationController.upsertIntegrationProperty(event);
        break;

      case httpMethod === "GET" && path.includes("/integrations/") && path.endsWith("/properties"):
        returnedResponse = await integrationController.listIntegrationProperties(event);
        break;

      case httpMethod === "POST" && path.includes("/integrations/") && path.endsWith("/sync/messages"):
        returnedResponse = await integrationController.triggerMessagesSync(event);
        break;

      case httpMethod === "POST" && path.includes("/integrations/") && path.endsWith("/sync/reservations"):
        returnedResponse = await integrationController.triggerReservationsSync(event);
        break;

      case httpMethod === "POST" && path.includes("/integrations/") && path.endsWith("/reservations/link"):
        returnedResponse = await integrationController.linkReservation(event);
        break;

      default:
        console.log("No matching route for:", route);
        returnedResponse = { statusCode: 404, response: "Not Found" };
    }
  } catch (error) {
    console.error("Error in handler:", error);
    returnedResponse = {
      statusCode: 500,
      response: "Internal Server Error",
    };
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    ...(returnedResponse?.headers || {}),
  };

  const responseBody =
    returnedResponse?.rawBody !== undefined
      ? returnedResponse.rawBody
      : JSON.stringify(returnedResponse?.response);

  return {
    statusCode: returnedResponse?.statusCode || 200,
    headers,
    body: responseBody,
  };
};