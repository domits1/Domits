import { Controller } from "./controller/controller.js";

let controller = null;

const WEBHOOK_ROUTES = {
  "/webhook/sync":             (c, e) => c.webhookSync(e),
  "/webhook/calendar-trigger": (c, e) => c.webhookCalendarTrigger(e),
  "/webhook/hook":             (c, e) => c.webhookHook(e),
};

const AUTH_ROUTES = {
  "POST:/connect":            (c, e) => c.connect(e),
  "DELETE:/disconnect":       (c, e) => c.disconnect(e),
  "GET:/status":              (c, e) => c.getStatus(e),
  "POST:/push/listings":      (c, e) => c.pushListings(e),
  "POST:/push/calendar":      (c, e) => c.pushCalendar(e),
  "POST:/push/reservations":  (c, e) => c.pushReservations(e),
};

export const handler = async (event) => {
  if (!controller) controller = new Controller();

  const method = event.httpMethod;
  const path   = event.path || "";

  if (method === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(["GET","POST","DELETE","PATCH","OPTIONS"]), body: "" };
  }

  for (const [suffix, fn] of Object.entries(WEBHOOK_ROUTES)) {
    if (path.endsWith(suffix)) return fn(controller, event);
  }

  const suffix = Object.keys(AUTH_ROUTES).find((k) => {
    const [m, s] = k.split(":");
    return method === m && path.endsWith(s);
  });
  if (suffix) return AUTH_ROUTES[suffix](controller, event);

  return { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ message: "Not found" }) };
};

function corsHeaders(methods = ["GET","OPTIONS"]) {
  return {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": methods.join(","),
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": "application/json",
  };
}
