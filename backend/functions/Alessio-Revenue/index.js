import Controller from "./controller/controller.js";

const controller = new Controller();

export const handler = async (event) => {
  if (event.httpMethod === "GET") {
    return await controller.getHostKpi(event);
  }

  return {
    statusCode: 400,
    body: "Bad Request: Unsupported HTTP method",
  };
};
