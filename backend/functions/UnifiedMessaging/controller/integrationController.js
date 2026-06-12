import IntegrationService from "../business/integrationService.js";
import ChannelManagementController from "../.shared/channelManagement/controller/channelManagementController.js";
import { extractIntegrationId, safeJson } from "./controllerUtils.js";

class IntegrationController {
  constructor({
    integrationService = new IntegrationService(),
    channelManagementController = new ChannelManagementController({
      channelManagementApiService: integrationService,
    }),
  } = {}) {
    this.integrationService = integrationService;
    this.channelManagementController = channelManagementController;
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
    return this.channelManagementController.connectHolidu(event);
  }

  async connectChannex(event) {
    return this.channelManagementController.connectChannex(event);
  }

  async checkHoliduStatus(event) {
    return this.channelManagementController.checkHoliduStatus(event);
  }

  async checkChannexStatus(event) {
    return this.channelManagementController.checkChannexStatus(event);
  }

  async listChannexProperties(event) {
    return this.channelManagementController.listChannexProperties(event);
  }

  async listChannexRoomTypes(event) {
    return this.channelManagementController.listChannexRoomTypes(event);
  }

  async listChannexRatePlans(event) {
    return this.channelManagementController.listChannexRatePlans(event);
  }

  async listLinkedChannexRoomTypes(event) {
    return this.channelManagementController.listLinkedChannexRoomTypes(event);
  }

  async listLinkedChannexRatePlans(event) {
    return this.channelManagementController.listLinkedChannexRatePlans(event);
  }

  async getChannexAriTargets(event) {
    return this.channelManagementController.getChannexAriTargets(event);
  }

  async previewChannexAri(event) {
    return this.channelManagementController.previewChannexAri(event);
  }

  async previewChannexAriPayloads(event) {
    return this.channelManagementController.previewChannexAriPayloads(event);
  }

  async listChannexSyncEvidence(event) {
    return this.channelManagementController.listChannexSyncEvidence(event);
  }

  async getChannexSyncEvidence(event) {
    return this.channelManagementController.getChannexSyncEvidence(event);
  }

  async getLatestChannexSyncEvidenceSummary(event) {
    return this.channelManagementController.getLatestChannexSyncEvidenceSummary(event);
  }

  async listChannexBookingRevisions(event) {
    return this.channelManagementController.listChannexBookingRevisions(event);
  }

  async receiveChannexBookingRevisions(event) {
    return this.channelManagementController.receiveChannexBookingRevisions(event);
  }

  async pullLatestChannexBookings(event) {
    return this.channelManagementController.pullLatestChannexBookings(event);
  }

  async cancelChannexCertificationBooking(event) {
    return this.channelManagementController.cancelChannexCertificationBooking(event);
  }

  async pollLatestChannexBookings(event) {
    return this.channelManagementController.pollLatestChannexBookings(event);
  }

  async acknowledgeChannexBookingRevisions(event) {
    return this.channelManagementController.acknowledgeChannexBookingRevisions(event);
  }

  async syncChannexAvailability(event) {
    return this.channelManagementController.syncChannexAvailability(event);
  }

  async syncChannexBookingAvailability(event) {
    return this.channelManagementController.syncChannexBookingAvailability(event);
  }

  async syncChannexCalendarChange(event) {
    return this.channelManagementController.syncChannexCalendarChange(event);
  }

  async syncChannexRestrictions(event) {
    return this.channelManagementController.syncChannexRestrictions(event);
  }

  async syncChannexAri(event) {
    return this.channelManagementController.syncChannexAri(event);
  }

  async syncChannexFull(event) {
    return this.channelManagementController.syncChannexFull(event);
  }

  async syncChannexCertificationTestCase(event) {
    return this.channelManagementController.syncChannexCertificationTestCase(event);
  }

  async saveChannexSetupMapping(event) {
    return this.channelManagementController.saveChannexSetupMapping(event);
  }

  async linkChannexProperty(event) {
    return this.channelManagementController.linkChannexProperty(event);
  }

  async linkChannexRoomType(event) {
    return this.channelManagementController.linkChannexRoomType(event);
  }

  async linkChannexRatePlan(event) {
    return this.channelManagementController.linkChannexRatePlan(event);
  }

  async disconnectHolidu(event) {
    return this.channelManagementController.disconnectHolidu(event);
  }

  async disconnectChannex(event) {
    return this.channelManagementController.disconnectChannex(event);
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
