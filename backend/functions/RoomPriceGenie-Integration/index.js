import Controller from "./controller/controller.js";

const controller = new Controller();

export const handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path || event.rawPath || "";

  // ── Outbound: Domits → RPG ─────────────────────────────────────────────────
  if (method === "POST"   && path.endsWith("/roompricegenie/connect"))            return controller.connect(event);
  if (method === "DELETE" && path.endsWith("/roompricegenie/disconnect"))         return controller.disconnect(event);
  if (method === "GET"    && path.endsWith("/roompricegenie/status"))             return controller.getStatus(event);
  if (method === "POST"   && path.endsWith("/roompricegenie/inventory"))          return controller.sendInventory(event);
  if (method === "POST"   && path.endsWith("/roompricegenie/availability/push"))  return controller.pushAvailability(event);
  if (method === "POST"   && path.endsWith("/roompricegenie/rates/push"))         return controller.pushRates(event);
  if (method === "PATCH"  && path.endsWith("/roompricegenie/settings"))           return controller.updateSettings(event);

  // ── Inbound: RPG → Domits (webhook) ──────────────────────────────────────
  if (method === "POST"   && path.endsWith("/roompricegenie/webhook/prices"))     return controller.receivePrices(event);

  return {
    statusCode: 400,
    body: JSON.stringify({ error: "Bad Request: Unsupported route" }),
  };
};
