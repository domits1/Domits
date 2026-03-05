import IntegrationService from "../business/integrationService.js";

const safeJson = (v) => {
  try {
    if (!v) return null;
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return null;
  }
};

const extractIntegrationId = (path) => {
  const m = String(path || "").match(/\/integrations\/([^/]+)/);
  return m?.[1] || null;
};

class IntegrationController {
  constructor() {
    this.integrationService = new IntegrationService();
  }

  async createIntegration(event) {
    const body = safeJson(event.body) || {};
    return await this.integrationService.createIntegration(body);
  }

  async listIntegrations(event) {
    const userId = event.queryStringParameters?.userId || null;
    return await this.integrationService.listIntegrations(userId);
  }

  async updateIntegration(event) {
    const integrationId = extractIntegrationId(event.path);
    const patch = safeJson(event.body) || {};
    return await this.integrationService.updateIntegration(integrationId, patch);
  }

  async getIntegrationLogs(event) {
    const integrationId = extractIntegrationId(event.path);
    const limitRaw = event.queryStringParameters?.limit;
    const limit = limitRaw ? Number(limitRaw) : 50;
    return await this.integrationService.getIntegrationLogs(integrationId, Number.isFinite(limit) ? limit : 50);
  }

  async upsertIntegrationProperty(event) {
    const integrationId = extractIntegrationId(event.path);
    const body = safeJson(event.body) || {};
    return await this.integrationService.upsertIntegrationProperty(integrationId, body);
  }

  async listIntegrationProperties(event) {
    const integrationId = extractIntegrationId(event.path);
    return await this.integrationService.listIntegrationProperties(integrationId);
  }

  async triggerMessagesSync(event) {
    const integrationId = extractIntegrationId(event.path);
    const body = safeJson(event.body) || {};
    return await this.integrationService.triggerSync(integrationId, "MESSAGES", body);
  }

  async triggerReservationsSync(event) {
    const integrationId = extractIntegrationId(event.path);
    const body = safeJson(event.body) || {};
    return await this.integrationService.triggerSync(integrationId, "RESERVATIONS", body);
  }

  async linkReservation(event) {
    const integrationId = extractIntegrationId(event.path);
    const body = safeJson(event.body) || {};
    return await this.integrationService.linkReservation(integrationId, body);
  }
}

export default IntegrationController;