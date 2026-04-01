import PreferencesCenterService from "../business/preferencesCenterService.js";
import {
  extractMessagingAutoReplyRuleId,
  extractMessagingSchedulerRuleId,
  extractMessagingTemplateId,
  safeJson,
} from "./controllerUtils.js";

export default class PreferencesCenterController {
  constructor() {
    this.preferencesCenterService = new PreferencesCenterService();
  }

  async getPreferences(event) {
    const userId = event.queryStringParameters?.userId || null;
    return await this.preferencesCenterService.getPreferences(userId);
  }

  async upsertPreferences(event) {
    const body = safeJson(event.body) || {};
    return await this.preferencesCenterService.upsertPreferences(body);
  }

  async listTemplates(event) {
    const userId = event.queryStringParameters?.userId || null;
    const includeArchived = event.queryStringParameters?.includeArchived;
    return await this.preferencesCenterService.listTemplates(userId, includeArchived);
  }

  async createTemplate(event) {
    const body = safeJson(event.body) || {};
    return await this.preferencesCenterService.createTemplate(body);
  }

  async updateTemplate(event) {
    const templateId = extractMessagingTemplateId(event.path);
    const body = safeJson(event.body) || {};
    return await this.preferencesCenterService.updateTemplate(templateId, body);
  }

  async duplicateTemplate(event) {
    const templateId = extractMessagingTemplateId(event.path);
    return await this.preferencesCenterService.duplicateTemplate(templateId);
  }

  async renderTemplate(event) {
    const templateId = extractMessagingTemplateId(event.path);
    const body = safeJson(event.body) || {};
    return await this.preferencesCenterService.renderTemplate(templateId, body);
  }

  async listAutoReplyRules(event) {
    const userId = event.queryStringParameters?.userId || null;
    return await this.preferencesCenterService.listAutoReplyRules(userId);
  }

  async createAutoReplyRule(event) {
    const body = safeJson(event.body) || {};
    return await this.preferencesCenterService.createAutoReplyRule(body);
  }

  async updateAutoReplyRule(event) {
    const ruleId = extractMessagingAutoReplyRuleId(event.path);
    const body = safeJson(event.body) || {};
    return await this.preferencesCenterService.updateAutoReplyRule(ruleId, body);
  }

  async listSchedulerRules(event) {
    const userId = event.queryStringParameters?.userId || null;
    return await this.preferencesCenterService.listSchedulerRules(userId);
  }

  async createSchedulerRule(event) {
    const body = safeJson(event.body) || {};
    return await this.preferencesCenterService.createSchedulerRule(body);
  }

  async updateSchedulerRule(event) {
    const ruleId = extractMessagingSchedulerRuleId(event.path);
    const body = safeJson(event.body) || {};
    return await this.preferencesCenterService.updateSchedulerRule(ruleId, body);
  }

  async setReservationAutomationPause(event) {
    const body = safeJson(event.body) || {};
    return await this.preferencesCenterService.setReservationAutomationPause(body);
  }
}
