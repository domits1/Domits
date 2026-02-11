import { Controller } from "./controller/controller.js";
import { okJson, err, isOptions } from "./util/http.js";

let controller = null;

export const handler = async (event) => {
  try {
    if (isOptions(event)) return okJson({});

    if (!controller) controller = new Controller();

    const method =
      event.httpMethod ||
      event.requestContext?.http?.method ||
      event.requestContext?.httpMethod;

    switch (method) {
      case "POST":
        return await controller.generate(event);

      case "GET":
        return await controller.generate(event);

      default:
        return err(404, `HTTP method not found: ${method || "unknown"}`);
    }
  } catch (e) {
    console.error(e);
    return err(500, "Something went wrong, please contact support.");
  }
};