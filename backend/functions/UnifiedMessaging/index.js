import MessageController from "./controller/messageController.js";

const controller = new MessageController();

export const handler = async (event) => {
  let returnedResponse = {};
  const { httpMethod, path, pathParameters, resource } = event;

  // Normalize path - handle both /default/messages and /messages formats
  const normalizedPath = path || resource || '';
  const pathSegments = normalizedPath.split('/').filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1] || '';

  console.log("Event received:", JSON.stringify({ 
    httpMethod, 
    path, 
    resource,
    normalizedPath,
    lastSegment,
    queryStringParameters: event.queryStringParameters 
  }));

  try {
    const route = `${httpMethod}:${normalizedPath}`;

    // Match routes based on the last path segment or resource pattern
    switch (true) {
      case httpMethod === "POST" && (lastSegment === "send" || normalizedPath.includes("/send")):
        returnedResponse = await controller.sendMessage(event);
        break;
      case httpMethod === "GET" && (lastSegment === "threads" || normalizedPath.includes("/threads")):
        returnedResponse = await controller.getThreads(event);
        break;
      case httpMethod === "GET" && (lastSegment === "messages" || normalizedPath.includes("/messages")):
        returnedResponse = await controller.getMessages(event);
        break;
      default:
        console.log("No matching route for:", route);
        returnedResponse = { 
          statusCode: 404, 
          response: { 
            error: "Not Found", 
            message: `Route ${route} not found. Available routes: POST /send, GET /threads, GET /messages` 
          } 
        };
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
