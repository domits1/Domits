import MessageController from "./controller/messageController.js";

const controller = new MessageController();

export const handler = async (event) => {
  let returnedResponse = {};
  const { httpMethod, path } = event;

  console.log("Event received:", JSON.stringify({ httpMethod, path, queryStringParameters: event.queryStringParameters }));

  try {
    const route = `${httpMethod}:${path}`;

    switch (true) {
      case httpMethod === "POST" && (path.endsWith("/send") || path.includes("/send")):
        returnedResponse = await controller.sendMessage(event);
        break;
      case httpMethod === "GET" && (path.endsWith("/threads") || path.includes("/threads")):
        returnedResponse = await controller.getThreads(event);
        break;
      case httpMethod === "GET" && (path.endsWith("/messages") || path.includes("/messages")):
        returnedResponse = await controller.getMessages(event);
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
