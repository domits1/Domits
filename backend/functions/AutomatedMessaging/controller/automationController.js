import { getAuthenticatedHost } from "../util/authContext.js";
import { badRequest } from "../util/httpErrors.js";

const parseBody = (event) => {
  if (!event?.body) return {};
  let body;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw badRequest("Request body must be a JSON object.");
  }
  return body;
};

const ok = (response, statusCode = 200) => ({ statusCode, response });

export default class AutomationController {
  constructor(automationService, schemaGuard = null) {
    this.service = automationService;
    this.schemaGuard = schemaGuard;
  }

  async authorize(event) {
    const host = getAuthenticatedHost(event);
    if (this.schemaGuard) await this.schemaGuard.assertReady();
    return host;
  }

  async list(event) {
    const host = await this.authorize(event);
    return ok(await this.service.list(host.userId));
  }

  async get(event, id) {
    const host = await this.authorize(event);
    return ok(await this.service.get(host.userId, id));
  }

  async create(event) {
    const host = await this.authorize(event);
    return ok(await this.service.create(host.userId, parseBody(event)), 201);
  }

  async update(event, id) {
    const host = await this.authorize(event);
    return ok(await this.service.update(host.userId, id, parseBody(event)));
  }

  async activate(event, id) {
    const host = await this.authorize(event);
    return ok(await this.service.setStatus(host.userId, id, "ACTIVE"));
  }

  async pause(event, id) {
    const host = await this.authorize(event);
    return ok(await this.service.setStatus(host.userId, id, "PAUSED"));
  }

  async preview(event, id = null) {
    const host = await this.authorize(event);
    return ok(await this.service.preview(host.userId, parseBody(event), id));
  }

  async deliveries(event, id) {
    const host = await this.authorize(event);
    return ok(await this.service.listDeliveries(host.userId, id));
  }

  async health(event) {
    await this.authorize(event);
    return ok({ ready: true });
  }
}
