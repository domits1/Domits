import IntegrationService from "../business/integrationService.js";
import {
  CHANNEX_RESTRICTIONS_SYNC_MODE,
  CHANNEX_RESTRICTIONS_SYNC_VERSION,
} from "../business/channexRestrictionsSyncVersion.js";
import { extractIntegrationId, extractLastPathSegment, safeJson } from "./controllerUtils.js";

const CHANNEX_FULL_CERTIFICATION_SYNC_VERSION = "full-sync-v1";
const summarizeErrorStack = (error) =>
  (typeof error?.stack === "string" ? error.stack : "")
    .split("\n")
    .slice(0, 6)
    .map((line) => line.trim())
    .filter(Boolean);

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
    const pageDateFrom = event.queryStringParameters?.pageDateFrom || null;
    const pageSizeDays = event.queryStringParameters?.pageSizeDays || null;
    return await this.integrationService.previewChannexAriPayloads(
      userId,
      domitsPropertyId,
      dateFrom,
      dateTo,
      {
        paginate: true,
        pageDateFrom,
        pageSizeDays,
      }
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

  async listChannexBookingRevisions(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    const limitRaw = event.queryStringParameters?.limit;
    const limit = limitRaw ? Number(limitRaw) : 50;
    const includeRawPayload = String(event.queryStringParameters?.includeRawPayload || "").toLowerCase() === "true";

    return await this.integrationService.listChannexBookingRevisions(userId, {
      domitsPropertyId,
      limit,
      includeRawPayload,
    });
  }

  async receiveChannexBookingRevisions(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    return await this.integrationService.receiveChannexBookingRevisions(userId, domitsPropertyId);
  }

  async acknowledgeChannexBookingRevisions(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    const body = safeJson(event.body) || {};
    return await this.integrationService.acknowledgeChannexBookingRevisions(userId, domitsPropertyId, body);
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
    console.info(
      JSON.stringify({
        event: "CHANNEX_RESTRICTIONS_SYNC_DIAGNOSTIC",
        restrictionsSyncVersion: CHANNEX_RESTRICTIONS_SYNC_VERSION,
        restrictionsSyncMode: CHANNEX_RESTRICTIONS_SYNC_MODE,
        stage: "controller_entry",
        userId,
        domitsPropertyId,
        dateFrom,
        dateTo,
      })
    );
    return await this.integrationService.syncChannexRestrictions(userId, domitsPropertyId, dateFrom, dateTo);
  }

  async syncChannexAri(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    const dateFrom = event.queryStringParameters?.dateFrom || null;
    const dateTo = event.queryStringParameters?.dateTo || null;
    return await this.integrationService.syncChannexAri(userId, domitsPropertyId, dateFrom, dateTo);
  }

  async syncChannexFull(event) {
    try {
      const userId = event.queryStringParameters?.userId || null;
      const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
      const dateFrom = event.queryStringParameters?.dateFrom || null;
      const dateTo = event.queryStringParameters?.dateTo || null;
      const dryRun = event.queryStringParameters?.dryRun || null;
      const providerMode = event.queryStringParameters?.providerMode || null;
      const debugStage = event.queryStringParameters?.debugStage || null;
      const persistEvidence = event.queryStringParameters?.persistEvidence || null;
      console.info(
        JSON.stringify({
          event: "CHANNEX_FULL_CERTIFICATION_SYNC_DIAGNOSTIC",
          fullCertificationSyncVersion: CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
          stage: "controller_reached",
          userId,
          domitsPropertyId,
          dateFrom,
          dateTo,
          dryRun,
          providerMode,
          debugStage,
          persistEvidence,
        })
      );
      return await this.integrationService.syncChannexFull(userId, domitsPropertyId, dateFrom, dateTo, {
        dryRun,
        providerMode,
        debugStage,
        persistEvidence,
      });
    } catch (error) {
      console.error("Error in Channex full certification sync controller:", error);
      return {
        statusCode: 500,
        response: {
          fullCertificationSyncVersion: CHANNEX_FULL_CERTIFICATION_SYNC_VERSION,
          stage: "controller_catch",
          error: "Failed to run Channex certification full sync.",
          errorCode: "CHANNEX_CERTIFICATION_FULL_SYNC_CONTROLLER_FAILED",
          errorName: error?.name ?? null,
          errorMessage: error?.message ?? "Unhandled Channex full certification sync controller error.",
          stackSummary: summarizeErrorStack(error),
        },
      };
    }
  }

  async syncChannexCertificationTestCase(event) {
    const userId = event.queryStringParameters?.userId || null;
    const domitsPropertyId = event.queryStringParameters?.domitsPropertyId || null;
    const body = safeJson(event.body) || {};
    return await this.integrationService.syncChannexCertificationTestCase(userId, domitsPropertyId, body);
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
