import IntegrationService from "../business/integrationService.js";
import { extractIntegrationId, extractLastPathSegment, safeJson } from "./controllerUtils.js";

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

  async listChannexRoomTypes(event) {
    const userId = event.queryStringParameters?.userId || null;
    const externalPropertyId = event.queryStringParameters?.externalPropertyId || null;
    return await this.integrationService.listChannexRoomTypes(userId, externalPropertyId);
  }

  async listChannexRatePlans(event) {
    const userId = event.queryStringParameters?.userId || null;
    const externalRoomTypeId = event.queryStringParameters?.externalRoomTypeId || null;
    return await this.integrationService.listChannexRatePlans(userId, externalRoomTypeId);
  }

  async listLinkedChannexRoomTypes(event) {
    const userId = event.queryStringParameters?.userId || null;
    return await this.integrationService.listLinkedChannexRoomTypes(userId);
  }

  async listLinkedChannexRatePlans(event) {
    const userId = event.queryStringParameters?.userId || null;
    return await this.integrationService.listLinkedChannexRatePlans(userId);
  }

  async getChannexAriTargets(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    return await this.integrationService.getChannexAriTargets(userId, domitsPropertyId);
  }

  async previewChannexAri(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    const dateFrom = event.queryStringParameters?.dateFrom || null;
    const dateTo = event.queryStringParameters?.dateTo || null;
    return await this.integrationService.previewChannexAri(userId, domitsPropertyId, dateFrom, dateTo);
  }

  async previewChannexAriPayloads(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    const dateFrom = event.queryStringParameters?.dateFrom || null;
    const dateTo = event.queryStringParameters?.dateTo || null;
    return await this.integrationService.previewChannexAriPayloads(
      userId,
      domitsPropertyId,
      dateFrom,
      dateTo
    );
  }

  async listChannexSyncEvidence(event) {
    const userId = event.queryStringParameters?.userId || null;
    const integrationAccountId = event.queryStringParameters?.integrationAccountId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    const syncType = event.queryStringParameters?.syncType || null;
    const status = event.queryStringParameters?.status || null;
    const dateFrom = event.queryStringParameters?.dateFrom || null;
    const dateTo = event.queryStringParameters?.dateTo || null;
    const limitRaw = event.queryStringParameters?.limit;
    const limit = limitRaw ? Number(limitRaw) : 50;

    return await this.integrationService.listChannexSyncEvidence(userId, {
      integrationAccountId,
      domitsPropertyId,
      syncType,
      status,
      dateFrom,
      dateTo,
      limit,
    });
  }

  async getChannexSyncEvidence(event) {
    const userId = event.queryStringParameters?.userId || null;
    const evidenceId = extractLastPathSegment(event.path);
    return await this.integrationService.getChannexSyncEvidence(userId, evidenceId);
  }

  async getLatestChannexSyncEvidenceSummary(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    return await this.integrationService.getLatestChannexSyncEvidenceSummary(userId, domitsPropertyId);
  }

  async syncChannexAvailability(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    const dateFrom = event.queryStringParameters?.dateFrom || null;
    const dateTo = event.queryStringParameters?.dateTo || null;
    return await this.integrationService.syncChannexAvailability(userId, domitsPropertyId, dateFrom, dateTo);
  }

  async syncChannexRestrictions(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    const dateFrom = event.queryStringParameters?.dateFrom || null;
    const dateTo = event.queryStringParameters?.dateTo || null;
    return await this.integrationService.syncChannexRestrictions(userId, domitsPropertyId, dateFrom, dateTo);
  }

  async syncChannexAri(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    const dateFrom = event.queryStringParameters?.dateFrom || null;
    const dateTo = event.queryStringParameters?.dateTo || null;
    return await this.integrationService.syncChannexAri(userId, domitsPropertyId, dateFrom, dateTo);
  }

  async linkChannexProperty(event) {
    const userId = event.queryStringParameters?.userId || null;
    const body = safeJson(event.body) || {};
    return await this.integrationService.linkChannexProperty(userId, body);
  }

  async linkChannexRoomType(event) {
    const userId = event.queryStringParameters?.userId || null;
    const body = safeJson(event.body) || {};
    return await this.integrationService.linkChannexRoomType(userId, body);
  }

  async linkChannexRatePlan(event) {
    const userId = event.queryStringParameters?.userId || null;
    const body = safeJson(event.body) || {};
    return await this.integrationService.linkChannexRatePlan(userId, body);
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
