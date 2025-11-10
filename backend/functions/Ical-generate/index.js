import { Controller } from "./controller/controller.js";
import { ok, err, isOptions } from "./util/http.js";

let controller = null;

export const handler = async (event) => {
  try {
    if (isOptions(event)) return ok({});

    if (!controller) controller = new Controller();

    const method = (event.httpMethod || event.requestContext?.http?.method || "").toUpperCase();

    if (method === "POST") {                     
      return await controller.generate(event);
    }

    return err(404, "Route not found.");
  } catch (e) {
    console.error(e);
    return err(500, "Something went wrong, please contact support.");
  }
};