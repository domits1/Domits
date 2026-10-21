import { Controller } from "./controller/controller.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };
import { GENERIC_ERROR_MESSAGE, respond } from "./util/http/response.js";

const METHOD_NOT_ALLOWED_MESSAGE = "Method not allowed.";

const ROUTES = new Map([["GET", (query) => (Object.hasOwn(query, "id") ? "getOwner" : "listOwners")]]);

let controller = null;

const resolveRoute = (event) => {
  const query = event.queryStringParameters ?? {};
  const route = ROUTES.get(event.httpMethod);
  if (!route || Object.hasOwn(query, "action")) {
    return null;
  }
  return route(query);
};

export const handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 200, headers: responseHeaders };
    }
    const methodName = resolveRoute(event);
    if (!methodName) {
      return respond(405, { message: METHOD_NOT_ALLOWED_MESSAGE });
    }
    controller ??= new Controller();
    return await controller[methodName](event);
  } catch (error) {
    console.error(error);
    return respond(500, { message: GENERIC_ERROR_MESSAGE });
  }
};
