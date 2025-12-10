import { Controller } from "./controller/controller.js";
import { ok, err, isOptions } from "./util/http.js";

let controller = null;

export const handler = async (event) => {
  try {
    if (isOptions(event)) return ok({});

    if (!controller) controller = new Controller();

    return await controller.retrieve(event);
  } catch (e) {
    console.error(e);
    return err(500, "Something went wrong, please contact support.");
  }
};