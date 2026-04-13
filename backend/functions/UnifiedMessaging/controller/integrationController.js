import IntegrationService from "../business/integrationService.js";
import { extractIntegrationId, safeJson } from "./controllerUtils.js";

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

  async startWhatsAppConnect(event) {
    const body = safeJson(event.body) || {};
    return await this.integrationService.startWhatsAppConnect(body);
  }

  async connectHolidu(event) {
    const body = safeJson(event.body) || {};
    return await this.integrationService.connectHolidu(body);
  }

  async connectChannex(event) {
    const body = safeJson(event.body) || {};
    return await this.integrationService.connectChannex(body);
  }

  async checkHoliduStatus(event) {
    const userId = event.queryStringParameters?.userId || null;
    return await this.integrationService.checkHoliduStatus(userId);
  }

  async checkChannexStatus(event) {
    const userId = event.queryStringParameters?.userId || null;
    return await this.integrationService.checkChannexStatus(userId);
  }

  async listChannexProperties(event) {
    const userId = event.queryStringParameters?.userId || null;
    return await this.integrationService.listChannexProperties(userId);
  }

  async disconnectHolidu(event) {
    const body = safeJson(event.body) || {};
    return await this.integrationService.disconnectHolidu(body);
  }

  async disconnectChannex(event) {
    const body = safeJson(event.body) || {};
    return await this.integrationService.disconnectChannex(body);
  }

  async completeWhatsAppConnect(event) {
    const body = safeJson(event.body) || {};
    return await this.integrationService.completeWhatsAppConnect(body);
  }

  async selectWhatsAppNumber(event) {
    const body = safeJson(event.body) || {};
    return await this.integrationService.selectWhatsAppNumber(body);
  }

  async disconnectWhatsApp(event) {
    const body = safeJson(event.body) || {};
    return await this.integrationService.disconnectWhatsApp(body);
  }

  async checkWhatsAppTokenHealth(event) {
    const body = safeJson(event.body) || {};
    return await this.integrationService.checkWhatsAppTokenHealth(body);
  }

  async refreshWhatsAppToken(event) {
    const body = safeJson(event.body) || {};
    return await this.integrationService.refreshWhatsAppToken(body);
  }
}

export default IntegrationController;
