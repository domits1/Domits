import MessageController from "./controller/messageController.js";

const controller = new MessageController();

export const handler = async (event) => {
  let returnedResponse = {};
  const { httpMethod, path } = event;

  try {
    const route = `${httpMethod}:${path}`;

    switch (true) {
      case httpMethod === "POST" && path.endsWith("/send"):
        returnedResponse = await controller.sendMessage(event);
        break;
      case httpMethod === "GET" && path.endsWith("/threads"):
        returnedResponse = await controller.getThreads(event);
        break;
      case httpMethod === "GET" && path.endsWith("/messages"):
        returnedResponse = await controller.getMessages(event);
        break;
      default:
        returnedResponse = { statusCode: 404, response: "Not Found" };
    }
  } catch (error) {
    console.error(error);
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
