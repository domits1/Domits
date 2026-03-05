import MessageController from "./controller/messageController.js";
import IntegrationController from "./controller/integrationController.js";

const messageController = new MessageController();
const integrationController = new IntegrationController();

export const handler = async (event) => {
  let returnedResponse = {};
  const { httpMethod, path } = event;

  console.log(
    "Event received:",
    JSON.stringify({ httpMethod, path, queryStringParameters: event.queryStringParameters })
  );

  try {
    const route = `${httpMethod}:${path}`;

    switch (true) {
      case httpMethod === "POST" && (path.endsWith("/send") || path.includes("/send")):
        returnedResponse = await messageController.sendMessage(event);
        break;

      case httpMethod === "GET" && (path.endsWith("/threads") || path.includes("/threads")):
        returnedResponse = await messageController.getThreads(event);
        break;

      case httpMethod === "GET" && (path.endsWith("/messages") || path.includes("/messages")):
        returnedResponse = await messageController.getMessages(event);
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

  return {
    statusCode: returnedResponse?.statusCode || 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      ...(returnedResponse?.headers || {}),
    },
    body: JSON.stringify(returnedResponse?.response),
  };
};