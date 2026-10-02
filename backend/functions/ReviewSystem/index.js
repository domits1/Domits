import { Controller } from "./controller/controller.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

let controller = null;

export const handler = async (event) => {
  try {
    if (!controller) {
      controller = new Controller();
    }

    const method = event.httpMethod;

    if (method === "OPTIONS") {
      return { statusCode: 200, headers: responseHeaders };
    }

    if (method === "POST") {
      return await controller.createReview(event);
    }
    if (["GET", "DELETE", "PATCH"].includes(method)) return await controller.manageReviews(event);

    return {
      statusCode: 405,
      headers: responseHeaders,
      body: JSON.stringify({ message: `Method ${method} not supported.` }),
    };
  } catch {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
