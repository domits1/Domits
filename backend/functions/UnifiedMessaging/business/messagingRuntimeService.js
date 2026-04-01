import crypto from "node:crypto";

import MessagingPreferenceRepository from "../data/messagingPreferenceRepository.js";
import MessagingAutoReplyRuleRepository from "../data/messagingAutoReplyRuleRepository.js";
import MessagingSchedulerExecutionLogRepository from "../data/messagingSchedulerExecutionLogRepository.js";
import TemplateRenderService from "./templateRenderService.js";
import EmailNotificationService from "./emailNotificationService.js";
import sendAutomatedMessage from "./sendAutomatedMessage.js";

const AUTO_REPLY_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const AUTO_REPLY_EXECUTION_TYPE = "AUTO_REPLY";
const AUTO_REPLY_ESCALATION_TYPE = "AUTO_REPLY_ESCALATION";

const normalizeKeywordPatterns = (value) =>
  String(value || "")
    .split(/[\n,]+/g)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const matchesKeywordPattern = (text, pattern) => {
  const haystack = String(text || "").toLowerCase();
  return normalizeKeywordPatterns(pattern).some((needle) => haystack.includes(needle));
};

const buildFingerprint = (value) =>
  crypto.createHash("sha1").update(String(value || "").trim().toLowerCase()).digest("hex").slice(0, 16);

export default class MessagingRuntimeService {
  constructor() {
    this.preferences = new MessagingPreferenceRepository();
    this.autoReplyRules = new MessagingAutoReplyRuleRepository();
    this.executionLogs = new MessagingSchedulerExecutionLogRepository();
    this.templateRenderService = new TemplateRenderService();
    this.emailService = new EmailNotificationService();
  }

  async sendHostNotificationEmail({ userId, subject, body, preferenceKey }) {
    const prefs = await this.preferences.getByUserId(userId);
    if (preferenceKey && !prefs?.[preferenceKey]) {
      return { skipped: true, reason: "preference_disabled" };
    }

    const contact = await this.emailService.getUserContact(userId);
    if (!contact?.email) {
      return { skipped: true, reason: "missing_host_email" };
    }

    await this.emailService.sendEmail({
      toEmail: contact.email,
      subject,
      body,
    });

    return { skipped: false };
  }

  async notifyHostOfGuestMessage({ hostId, guestId, content, platform, threadId }) {
    return this.sendHostNotificationEmail({
      userId: hostId,
      preferenceKey: "guestMessageEmailEnabled",
      subject: `New guest message in Domits (${platform || "DOMITS"})`,
      body:
        `You received a new guest message.\n\n` +
        `Thread: ${threadId || "Unknown"}\n` +
        `Guest: ${guestId}\n` +
        `Channel: ${platform || "DOMITS"}\n\n` +
        `Message preview:\n${String(content || "").slice(0, 500)}`,
    });
  }

  async notifyHostOfAutomaticReply({ hostId, guestId, replyPreview, threadId, ruleName }) {
    return this.sendHostNotificationEmail({
      userId: hostId,
      preferenceKey: "autoReplyEmailEnabled",
      subject: "Automatic reply sent in Domits",
      body:
        `An automatic reply was sent to a guest.\n\n` +
        `Thread: ${threadId || "Unknown"}\n` +
        `Guest: ${guestId}\n` +
        `Rule: ${ruleName || "Unknown"}\n\n` +
        `Reply preview:\n${String(replyPreview || "").slice(0, 500)}`,
    });
  }

  async logExecution(payload) {
    return this.executionLogs.create({
      executionType: payload.executionType,
      userId: payload.userId,
      schedulerRuleId: payload.schedulerRuleId ?? null,
      bookingId: payload.bookingId ?? null,
      threadId: payload.threadId ?? null,
      messageId: payload.messageId ?? null,
      uniqueKey: payload.uniqueKey,
      status: payload.status || "SUCCESS",
      details: payload.details ? JSON.stringify(payload.details) : null,
      scheduledFor: payload.scheduledFor ?? null,
      executedAt: payload.executedAt ?? Date.now(),
    });
  }

  async processInboundGuestMessage({
    hostId,
    guestId,
    threadId,
    propertyId = null,
    platform = "DOMITS",
    content,
    messageId = null,
    integrationAccountId = null,
    externalThreadId = null,
    metadata = {},
  }) {
    if (!hostId || !guestId || !threadId) return;

    if (metadata?.isAutomated) return;

    const prefs = await this.preferences.getByUserId(hostId);

    await this.notifyHostOfGuestMessage({ hostId, guestId, content, platform, threadId });

    const rules = await this.autoReplyRules.listByUserId(hostId);
    const applicableRules = rules.filter(
      (rule) => rule.isEnabled && String(rule.channel || "").toUpperCase() === String(platform || "DOMITS").toUpperCase()
    );

    const matchingRule = applicableRules.find((rule) => matchesKeywordPattern(content, rule.keywordPattern));
    if (!matchingRule) return;

    const recentExecutions = await this.executionLogs.listRecentByThreadAndType(
      threadId,
      AUTO_REPLY_EXECUTION_TYPE,
      Date.now() - AUTO_REPLY_COOLDOWN_MS
    );

    const fingerprint = buildFingerprint(content);
    const duplicateExecution = recentExecutions.find((log) => String(log.uniqueKey || "").includes(`:${matchingRule.id}:`));

    if (duplicateExecution) {
      const escalationKey = `${AUTO_REPLY_ESCALATION_TYPE}:${threadId}:${matchingRule.id}:${fingerprint}`;
      const existingEscalation = await this.executionLogs.findByUniqueKey(escalationKey);

      if (!existingEscalation) {
        await this.logExecution({
          executionType: AUTO_REPLY_ESCALATION_TYPE,
          userId: hostId,
          threadId,
          uniqueKey: escalationKey,
          details: {
            guestId,
            ruleId: matchingRule.id,
            content,
            note: "Guest replied again after an automatic reply. Auto reply suppressed to avoid loops.",
          },
        });

        await this.notifyHostOfGuestMessage({
          hostId,
          guestId,
          content: `Guest replied again after an automatic reply.\n\n${content}`,
          platform,
          threadId,
        });
      }

      return;
    }

    let renderedContent = matchingRule.replyText || "";
    if (matchingRule.replyTemplateId) {
      const rendered = await this.templateRenderService.renderTemplateById({
        templateId: matchingRule.replyTemplateId,
        threadId,
        hostId,
        guestId,
        propertyId,
      });
      renderedContent = rendered.renderedContent;
    } else if (matchingRule.replyText) {
      const rendered = await this.templateRenderService.renderRawContent({
        content: matchingRule.replyText,
        threadId,
        hostId,
        guestId,
        propertyId,
      });
      renderedContent = rendered.renderedContent;
    }

    if (!renderedContent.trim()) return;

    const sendResult = await sendAutomatedMessage({
      senderId: hostId,
      recipientId: guestId,
      propertyId,
      messageText: renderedContent,
      messageType: "auto_reply",
      hostId,
      guestId,
      platform,
      integrationAccountId,
      externalThreadId,
      threadId,
      metadata: {
        isAutomated: true,
        autoReplyRuleId: matchingRule.id,
        autoReplyRuleName: matchingRule.name,
        outOfOfficeApplied: prefs?.outOfOfficeEnabled ?? false,
      },
    });

    await this.logExecution({
      executionType: AUTO_REPLY_EXECUTION_TYPE,
      userId: hostId,
      schedulerRuleId: matchingRule.id,
      threadId,
      messageId: sendResult?.id || null,
      uniqueKey: `${AUTO_REPLY_EXECUTION_TYPE}:${threadId}:${matchingRule.id}:${fingerprint}`,
      details: {
        guestId,
        ruleId: matchingRule.id,
        platform,
        outOfOfficeApplied: prefs?.outOfOfficeEnabled ?? false,
      },
    });

    await this.notifyHostOfAutomaticReply({
      hostId,
      guestId,
      replyPreview: renderedContent,
      threadId,
      ruleName: prefs?.outOfOfficeEnabled ? `${matchingRule.name} (out of office)` : matchingRule.name,
    });
  }
}
