import { Controller } from "./controller/controller.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

const GENERIC_ERROR_MESSAGE = "Something went wrong, please contact support.";
const METHOD_NOT_ALLOWED_MESSAGE = "Method not allowed.";

const ROUTES = new Map([["GET", (query) => (Object.hasOwn(query, "id") ? "getOwner" : "listOwners")]]);

let controller = null;

const respond = (statusCode, body) => ({
  statusCode,
  headers: responseHeaders,
  body: JSON.stringify(body),
});

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
