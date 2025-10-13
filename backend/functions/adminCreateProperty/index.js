import { Controller } from "./controller/controller.js";
import Database from "database";
import responseHeaders from "./utils/constant/responseHeader.json" with { type: "json" };

let controller = null;
let pool = null;

export const handler = async (event) => {
  console.log("🟢 Lambda START");
  console.log("Event:", JSON.stringify(event, null, 2));

  if (!controller) controller = new Controller();
  if (!pool) {
    try {
      pool = await Database.getInstance();
      console.log("✅ Database pool initialized successfully");
    } catch (err) {
      console.error("❌ Database pool init failed:", err);
      return {
        statusCode: 500,
        headers: responseHeaders,
        body: JSON.stringify({ error: "DB pool init failed", detail: err.message })
      };
    }
  }

  // FIX: fallback voor direct test-event
  const method = (event.httpMethod || event.requestContext?.http?.method || "POST").toUpperCase();
  console.log("HTTP method:", method);

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: responseHeaders };
  }

  if (method === "POST") {
    try {
      const result = await controller.createProperty(event);
      console.log("✅ Controller finished successfully");
      return result;
    } catch (err) {
      console.error("❌ Handler error:", err);
      return {
        statusCode: 500,
        headers: responseHeaders,
        body: JSON.stringify({ error: "Handler failed", detail: err.message })
      };
    }
  }

  console.log("❌ Unsupported HTTP method");
  return { statusCode: 404, headers: responseHeaders, body: "HTTP method not found." };
};