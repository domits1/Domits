import { Controller } from "./controller/controller.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };
import { errorResponse, respond } from "./util/http/response.js";

const METHOD_NOT_ALLOWED_MESSAGE = "Method not allowed.";

const ROUTES = Object.freeze({
  GET: Object.freeze({ "upload-url": "getUploadUrl" }),
});

let controller = null;

const controllerMethodFor = (event) => {
  const actions = Object.hasOwn(ROUTES, event.httpMethod) ? ROUTES[event.httpMethod] : {};
  const action = event.queryStringParameters?.action;
  return Object.hasOwn(actions, action) ? actions[action] : null;
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: responseHeaders };
  }
  const methodName = controllerMethodFor(event);
  if (!methodName) {
    return respond(405, { message: METHOD_NOT_ALLOWED_MESSAGE });
  }
  try {
    controller ??= new Controller();
    return await controller[methodName](event);
  } catch (error) {
    return errorResponse(error);
  }
};
