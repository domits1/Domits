import { Controller } from "./controller/controller.js";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };
import { GENERIC_ERROR_MESSAGE, respond } from "./util/http/response.js";

const METHOD_NOT_ALLOWED_MESSAGE = "Method not allowed.";

const NO_ACTION = Symbol("no-action");

const ROUTES = new Map([
  ["GET", new Map([[NO_ACTION, { withId: "getOwner", withoutId: "listOwners" }]])],
  ["POST", new Map([[NO_ACTION, { withId: null, withoutId: "createOwner" }]])],
  ["PUT", new Map([["set-shares", { withId: null, withoutId: "setShares" }]])],
  [
    "PATCH",
    new Map([
      [NO_ACTION, { withId: "updateOwner", withoutId: null }],
      ["archive", { withId: "archiveOwner", withoutId: null }],
    ]),
  ],
]);

let controller = null;

const resolveRoute = (event) => {
  const query = event.queryStringParameters ?? {};
  const action = Object.hasOwn(query, "action") ? query.action : NO_ACTION;
  const route = ROUTES.get(event.httpMethod)?.get(action);
  if (!route) {
    return null;
  }
  return Object.hasOwn(query, "id") ? route.withId : route.withoutId;
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
