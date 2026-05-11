import { Controller } from "./controller/controller.js";

let controller = null;

export const handler = async (event) => {
  if (!controller) controller = new Controller();

  const method = event.httpMethod;
  const path   = event.path || "";

  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders(["GET","POST","DELETE","PATCH","OPTIONS"]),
      body: "",
    };
  }

  // Inbound webhooks from PriceLabs (no Cognito auth — signature verified inside)
  if (path.endsWith("/webhook/sync"))             return controller.webhookSync(event);
  if (path.endsWith("/webhook/calendar-trigger")) return controller.webhookCalendarTrigger(event);
  if (path.endsWith("/webhook/hook"))             return controller.webhookHook(event);

  // Host-authenticated routes
  if (method === "POST"   && path.endsWith("/connect"))            return controller.connect(event);
  if (method === "DELETE" && path.endsWith("/disconnect"))         return controller.disconnect(event);
  if (method === "GET"    && path.endsWith("/status"))             return controller.getStatus(event);
  if (method === "POST"   && path.endsWith("/push/listings"))      return controller.pushListings(event);
  if (method === "POST"   && path.endsWith("/push/calendar"))      return controller.pushCalendar(event);
  if (method === "POST"   && path.endsWith("/push/reservations"))  return controller.pushReservations(event);

  return {
    statusCode: 404,
    headers: corsHeaders(),
    body: JSON.stringify({ message: "Not found" }),
  };
};

function corsHeaders(methods = ["GET","OPTIONS"]) {
  return {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": methods.join(","),
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json",
  };
}
