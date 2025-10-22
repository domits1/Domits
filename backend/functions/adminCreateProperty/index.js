import { Controller } from "./controller/controller.js";
import Database from "database";
import responseHeaders from "./util/constant/responseHeader.json" with { type: "json" };

let controller = null;
let pool = null;

export const handler = async (event) => {
  if (!controller) controller = new Controller();
  if (!pool) pool = await Database.getInstance();

  const method = (event.httpMethod || "").toUpperCase();
  if (method === "OPTIONS") return { statusCode: 204, headers: responseHeaders };
  if (method === "POST") return await controller.createProperty(event);

  return { statusCode: 404, headers: responseHeaders, body: "HTTP method not found." };
};