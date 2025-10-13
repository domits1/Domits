import { Service } from "../business/service/service.js";
import { AuthManager } from "../auth/authManager.js";
import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function numericRegistration(len = 18) {
  const base = Date.now().toString();
  const need = Math.max(0, len - base.length);
  let r = "";
  while (r.length < need) r += Math.floor(Math.random() * 10).toString();
  return base + r.slice(0, need);
}

export class Controller {
  service;
  authManager;

  constructor() {
    this.service = new Service();
    this.authManager = new AuthManager();
  }

  async createProperty(event) {
    try {
      const token = event.headers?.Authorization || event.headers?.authorization || "";
      const hostId = await this.authManager.authorizeGroupRequest(token, "Host");
      const raw = event.body || "{}";
      const body = typeof raw === "string" ? JSON.parse(raw || "{}") : raw;

      const id = newId();
      const now = Date.now();
      const registrationnumber = numericRegistration(18);

      const row = {
        id,
        title: body.name || "New Property",
        subtitle: body.segment || "",
        description: [
          "Created by admin",
          body.email ? `Email: ${body.email}` : "",
          body.phone ? `Phone: ${body.phone}` : "",
          body.restaurantOrCasino ? `(${body.restaurantOrCasino})` : ""
        ].filter(Boolean).join(" · "),
        registrationnumber,
        hostid: hostId,
        status: "DRAFT",
        createdat: now,
        updatedat: 0
      };

      return { statusCode: 200, headers: responseHeaders, body: row.id };
    } catch (error) {
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify({ error: "create failed" }) };
    }
  }
}