import MessagingPreferenceRepository from "../data/messagingPreferenceRepository.js";
import MessagingTemplateRepository from "../data/messagingTemplateRepository.js";
import MessagingAutoReplyRuleRepository from "../data/messagingAutoReplyRuleRepository.js";

const ok = (response, statusCode = 200) => ({ statusCode, response });
const bad = (statusCode, response) => ({ statusCode, response });
const requireStr = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

const normalizeBool = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

const normalizeNullableInt = (value, fieldName) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    const error = new Error(`${fieldName} must be a non-negative integer.`);
    error.statusCode = 400;
    throw error;
  }
  return parsed;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const normalizeNullableTime = (value, fieldName) => {
  if (value === null || value === undefined || value === "") return null;
  const trimmed = String(value).trim();
  if (!TIME_PATTERN.test(trimmed)) {
    const error = new Error(`${fieldName} must be in HH:MM or HH:MM:SS format.`);
    error.statusCode = 400;
    throw error;
  }
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
};

const normalizeLanguage = (value) => {
  const normalized = requireStr(value) || "en";
  return normalized.slice(0, 16).toLowerCase();
};

const normalizeNullableText = (value) => {
  const normalized = requireStr(value);
  return normalized || null;
};

const toPreferenceResponse = (userId, row) => ({
  id: row?.id || null,
  userId,
  guestMessageEmailEnabled: row?.guestMessageEmailEnabled ?? true,
  autoReplyEmailEnabled: row?.autoReplyEmailEnabled ?? false,
  defaultResponseTimeTargetMinutes: row?.defaultResponseTimeTargetMinutes ?? null,
  businessHoursEnabled: row?.businessHoursEnabled ?? false,
  businessHoursStart: row?.businessHoursStart ?? null,
  businessHoursEnd: row?.businessHoursEnd ?? null,
  outOfOfficeEnabled: row?.outOfOfficeEnabled ?? false,
  defaultMessageLanguage: row?.defaultMessageLanguage ?? "en",
  createdAt: row?.createdAt ?? null,
  updatedAt: row?.updatedAt ?? null,
});

export default class PreferencesCenterService {
  constructor() {
    this.preferences = new MessagingPreferenceRepository();
    this.templates = new MessagingTemplateRepository();
    this.autoReplyRules = new MessagingAutoReplyRuleRepository();
  }

  async getPreferences(userId) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    const row = await this.preferences.getByUserId(normalizedUserId);
    return ok(toPreferenceResponse(normalizedUserId, row));
  }

  async upsertPreferences(body = {}) {
    try {
      const userId = requireStr(body.userId);
      if (!userId) return bad(400, { error: "Missing required field: userId" });

      const payload = {
        userId,
        guestMessageEmailEnabled: normalizeBool(body.guestMessageEmailEnabled, true),
        autoReplyEmailEnabled: normalizeBool(body.autoReplyEmailEnabled, false),
        defaultResponseTimeTargetMinutes: normalizeNullableInt(
          body.defaultResponseTimeTargetMinutes,
          "defaultResponseTimeTargetMinutes"
        ),
        businessHoursEnabled: normalizeBool(body.businessHoursEnabled, false),
        businessHoursStart: normalizeNullableTime(body.businessHoursStart, "businessHoursStart"),
        businessHoursEnd: normalizeNullableTime(body.businessHoursEnd, "businessHoursEnd"),
        outOfOfficeEnabled: normalizeBool(body.outOfOfficeEnabled, false),
        defaultMessageLanguage: normalizeLanguage(body.defaultMessageLanguage),
      };

      const saved = await this.preferences.upsert(payload);
      return ok(toPreferenceResponse(userId, saved));
    } catch (error) {
      return bad(error.statusCode || 500, { error: error.message || "Failed to save messaging preferences." });
    }
  }

  async listTemplates(userId, includeArchivedRaw) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    const includeArchived = includeArchivedRaw === undefined ? true : normalizeBool(includeArchivedRaw, true);
    const rows = await this.templates.listByUserId(normalizedUserId, { includeArchived });
    return ok(rows);
  }

  async createTemplate(body = {}) {
    const userId = requireStr(body.userId);
    const name = requireStr(body.name);
    const content = requireStr(body.content);

    if (!userId) return bad(400, { error: "Missing required field: userId" });
    if (!name) return bad(400, { error: "Missing required field: name" });
    if (!content) return bad(400, { error: "Missing required field: content" });

    const saved = await this.templates.create({
      userId,
      name,
      category: normalizeNullableText(body.category),
      language: normalizeLanguage(body.language),
      content,
      isArchived: normalizeBool(body.isArchived, false),
    });

    return ok(saved, 201);
  }

  async updateTemplate(templateId, body = {}) {
    const existing = await this.templates.getById(templateId);
    if (!existing) return bad(404, { error: "Messaging template not found." });

    const next = {
      name: requireStr(body.name) || existing.name,
      category: Object.hasOwn(body, "category") ? normalizeNullableText(body.category) : existing.category,
      language: Object.hasOwn(body, "language") ? normalizeLanguage(body.language) : existing.language,
      content: requireStr(body.content) || existing.content,
      isArchived: Object.hasOwn(body, "isArchived") ? normalizeBool(body.isArchived, existing.isArchived) : existing.isArchived,
    };

    const saved = await this.templates.update(templateId, next);
    return ok(saved);
  }

  async duplicateTemplate(templateId) {
    const existing = await this.templates.getById(templateId);
    if (!existing) return bad(404, { error: "Messaging template not found." });

    const duplicate = await this.templates.create({
      userId: existing.userId,
      name: `${existing.name} (Copy)`,
      category: existing.category,
      language: existing.language,
      content: existing.content,
      isArchived: false,
    });

    return ok(duplicate, 201);
  }

  validateAutoReplyPayload(body = {}, existing = null) {
    const userId = requireStr(body.userId) || existing?.userId || null;
    const name = requireStr(body.name) || existing?.name || null;
    const channel = requireStr(body.channel) || existing?.channel || null;
    const keywordPattern = requireStr(body.keywordPattern) || existing?.keywordPattern || null;

    const replyTemplateId = Object.hasOwn(body, "replyTemplateId")
      ? normalizeNullableText(body.replyTemplateId)
      : existing?.replyTemplateId ?? null;
    const replyText = Object.hasOwn(body, "replyText") ? normalizeNullableText(body.replyText) : existing?.replyText ?? null;
    const isEnabled = Object.hasOwn(body, "isEnabled") ? normalizeBool(body.isEnabled, true) : existing?.isEnabled ?? true;

    if (!userId) return { error: "Missing required field: userId" };
    if (!name) return { error: "Missing required field: name" };
    if (!channel) return { error: "Missing required field: channel" };
    if (!keywordPattern) return { error: "Missing required field: keywordPattern" };

    const hasTemplate = !!replyTemplateId;
    const hasReplyText = !!replyText;
    if (hasTemplate === hasReplyText) {
      return { error: "Provide exactly one of replyTemplateId or replyText." };
    }

    return {
      payload: {
        userId,
        name,
        channel: channel.toUpperCase(),
        keywordPattern,
        replyTemplateId,
        replyText,
        isEnabled,
      },
    };
  }

  async listAutoReplyRules(userId) {
    const normalizedUserId = requireStr(userId);
    if (!normalizedUserId) return bad(400, { error: "Missing required query param: userId" });

    const rows = await this.autoReplyRules.listByUserId(normalizedUserId);
    return ok(rows);
  }

  async createAutoReplyRule(body = {}) {
    const validated = this.validateAutoReplyPayload(body);
    if (validated.error) return bad(400, { error: validated.error });

    if (validated.payload.replyTemplateId) {
      const template = await this.templates.getById(validated.payload.replyTemplateId);
      if (!template || template.userId !== validated.payload.userId) {
        return bad(400, { error: "replyTemplateId must reference a template owned by the same user." });
      }
    }

    const saved = await this.autoReplyRules.create(validated.payload);
    return ok(saved, 201);
  }

  async updateAutoReplyRule(ruleId, body = {}) {
    const existing = await this.autoReplyRules.getById(ruleId);
    if (!existing) return bad(404, { error: "Messaging auto reply rule not found." });

    const validated = this.validateAutoReplyPayload(body, existing);
    if (validated.error) return bad(400, { error: validated.error });

    if (validated.payload.replyTemplateId) {
      const template = await this.templates.getById(validated.payload.replyTemplateId);
      if (!template || template.userId !== validated.payload.userId) {
        return bad(400, { error: "replyTemplateId must reference a template owned by the same user." });
      }
    }

    const saved = await this.autoReplyRules.update(ruleId, validated.payload);
    return ok(saved);
  }
}
