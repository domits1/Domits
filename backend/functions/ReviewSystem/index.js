import { Controller } from "./controller/controller.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

let controller;

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: responseHeaders };
  }

  if (event.httpMethod !== "POST" || event.resource !== "/reviews") {
    return {
      statusCode: 405,
      headers: responseHeaders,
      body: JSON.stringify({ message: "Method or resource not supported." }),
    };
  }

  try {
    controller ??= new Controller();
    return await controller.createReview(event);
  } catch {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
