import MessagingPreferenceRepository from "../data/messagingPreferenceRepository.js";
import MessagingSchedulerRuleRepository from "../data/messagingSchedulerRuleRepository.js";
import MessagingSchedulerExecutionLogRepository from "../data/messagingSchedulerExecutionLogRepository.js";
import MessagingReservationAutomationPauseRepository from "../data/messagingReservationAutomationPauseRepository.js";
import MessagingContextRepository from "../data/messagingContextRepository.js";
import TemplateRenderService from "./templateRenderService.js";
import EmailNotificationService from "./emailNotificationService.js";
import sendAutomatedMessage from "./sendAutomatedMessage.js";

const REMINDER_TYPE = "DAILY_REMINDER";
const LIFECYCLE_TYPE = "LIFECYCLE_SCHEDULE";

const toTimeParts = (value) => {
  const [hours = "09", minutes = "00"] = String(value || "09:00").slice(0, 5).split(":");
  return { hours: Number(hours), minutes: Number(minutes) };
};

const formatLocalDate = (date, timeZone) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const isReminderDueNow = ({ now, timeZone, configuredTime }) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const currentHour = Number(parts.find((item) => item.type === "hour")?.value || 0);
  const currentMinute = Number(parts.find((item) => item.type === "minute")?.value || 0);
  const { hours, minutes } = toTimeParts(configuredTime);

  return currentHour === hours && currentMinute >= minutes && currentMinute < minutes + 15;
};

const normalizeTriggerOffsetMs = (rule) => {
  const offsetValue = Number(rule?.offsetValue || 0);
  if (!offsetValue) return 0;

  switch (String(rule?.offsetUnit || "").toUpperCase()) {
    case "DAYS":
      return offsetValue * 24 * 60 * 60 * 1000;
    case "HOURS":
      return offsetValue * 60 * 60 * 1000;
    default:
      return 0;
  }
};

const computeScheduledAt = (rule, booking) => {
  const arrival = Number(booking?.arrivaldate || 0);
  const departure = Number(booking?.departuredate || 0);
  const offsetMs = normalizeTriggerOffsetMs(rule);

  switch (String(rule?.triggerType || "").toUpperCase()) {
    case "BEFORE_CHECKIN":
      return arrival - offsetMs;
    case "DURING_STAY":
      return arrival + offsetMs;
    case "BEFORE_CHECKOUT":
      return departure - offsetMs;
    case "AFTER_CHECKOUT":
      return departure + offsetMs;
    default:
      return null;
  }
};

export default class MessagingSchedulerService {
  constructor() {
    this.preferences = new MessagingPreferenceRepository();
    this.schedulerRules = new MessagingSchedulerRuleRepository();
    this.executionLogs = new MessagingSchedulerExecutionLogRepository();
    this.pauseRepository = new MessagingReservationAutomationPauseRepository();
    this.contextRepository = new MessagingContextRepository();
    this.templateRenderService = new TemplateRenderService();
    this.emailService = new EmailNotificationService();
  }

  async run(event = {}) {
    const now = new Date();
    const reminderResults = await this.processDailyReminders(now);
    const lifecycleResults = await this.processLifecycleRules(now, event);

    return {
      ok: true,
      processedDailyReminders: reminderResults.length,
      processedLifecycleRules: lifecycleResults.length,
      reminderResults,
      lifecycleResults,
    };
  }

  async processDailyReminders(now) {
    const client = await import("../ORM/index.js");
    const db = await client.default.getInstance();
    const rows = await db.query(
      `
        SELECT *
        FROM main.messaging_preference
        WHERE "dailyReminderEnabled" = TRUE
      `
    );

    const results = [];

    for (const row of rows) {
      const timeZone = row.dailyReminderTimezone || "UTC";
      if (!isReminderDueNow({ now, timeZone, configuredTime: row.dailyReminderTime || "09:00:00" })) {
        continue;
      }

      const localDate = formatLocalDate(now, timeZone);
      const uniqueKey = `${REMINDER_TYPE}:${row.userId}:${localDate}`;
      const existing = await this.executionLogs.findByUniqueKey(uniqueKey);
      if (existing) continue;

      const contact = await this.emailService.getUserContact(row.userId);
      if (!contact?.email) {
        results.push({ userId: row.userId, skipped: true, reason: "missing_host_email" });
        continue;
      }

      const summary = await this.contextRepository.getDailyReminderSummary(row.userId);
      const body =
        `Your Domits inbox morning summary\n\n` +
        `Unanswered messages: ${summary.unansweredMessages}\n` +
        `Pending guest inquiries: ${summary.pendingGuestInquiries}\n` +
        `Conversations awaiting response: ${summary.conversationsAwaitingResponse}\n\n` +
        `Timezone: ${timeZone}`;

      await this.emailService.sendEmail({
        toEmail: contact.email,
        subject: "Domits daily inbox reminder",
        body,
      });

      await this.executionLogs.create({
        executionType: REMINDER_TYPE,
        userId: row.userId,
        uniqueKey,
        status: "SENT",
        details: JSON.stringify(summary),
        scheduledFor: Date.now(),
        executedAt: Date.now(),
      });

      results.push({ userId: row.userId, sent: true, summary });
    }

    return results;
  }

  async processLifecycleRules(now) {
    const rules = await this.schedulerRules.listEnabled();
    const byUser = new Map();

    for (const rule of rules) {
      if (String(rule.channel || "").toUpperCase() !== "DOMITS") {
        continue;
      }

      if (!byUser.has(rule.userId)) {
        byUser.set(rule.userId, []);
      }
      byUser.get(rule.userId).push(rule);
    }

    const results = [];

    for (const [userId, userRules] of byUser.entries()) {
      const bookings = await this.contextRepository.listLifecycleBookingContextsForUser(userId);

      for (const booking of bookings) {
        for (const rule of userRules) {
          const scheduledAt = computeScheduledAt(rule, booking);
          if (!scheduledAt || scheduledAt > now.getTime()) continue;

          const uniqueKey = `${LIFECYCLE_TYPE}:${rule.id}:${booking.booking_id}`;
          const alreadyExecuted = await this.executionLogs.findByUniqueKey(uniqueKey);
          if (alreadyExecuted) continue;

          const paused = await this.pauseRepository.isPaused({
            userId,
            bookingId: booking.booking_id,
            schedulerRuleId: rule.id,
          });
          if (paused) {
            results.push({ bookingId: booking.booking_id, ruleId: rule.id, skipped: true, reason: "paused" });
            continue;
          }

          if (rule.skipIfGuestResponded && booking.lastinboundat && (!booking.lastoutboundat || booking.lastinboundat > booking.lastoutboundat)) {
            await this.executionLogs.create({
              executionType: LIFECYCLE_TYPE,
              userId,
              schedulerRuleId: rule.id,
              bookingId: booking.booking_id,
              threadId: booking.thread_id,
              uniqueKey,
              status: "SKIPPED",
              details: JSON.stringify({ reason: "guest_responded" }),
              scheduledFor: scheduledAt,
              executedAt: Date.now(),
            });
            results.push({ bookingId: booking.booking_id, ruleId: rule.id, skipped: true, reason: "guest_responded" });
            continue;
          }

          const rendered = await this.templateRenderService.renderTemplateById({
            templateId: rule.templateId,
            threadId: booking.thread_id,
            hostId: booking.hostid,
            guestId: booking.guestid,
            propertyId: booking.property_id,
          });

          if (!booking.thread_id) {
            results.push({ bookingId: booking.booking_id, ruleId: rule.id, skipped: true, reason: "missing_domits_thread" });
            continue;
          }

          const sent = await sendAutomatedMessage({
            senderId: booking.hostid,
            recipientId: booking.guestid,
            propertyId: booking.property_id,
            messageText: rendered.renderedContent,
            messageType: "scheduled_template",
            hostId: booking.hostid,
            guestId: booking.guestid,
            platform: "DOMITS",
            threadId: booking.thread_id,
            metadata: {
              schedulerRuleId: rule.id,
              schedulerTriggerType: rule.triggerType,
              isAutomated: true,
            },
          });

          await this.executionLogs.create({
            executionType: LIFECYCLE_TYPE,
            userId,
            schedulerRuleId: rule.id,
            bookingId: booking.booking_id,
            threadId: booking.thread_id,
            messageId: sent?.id || null,
            uniqueKey,
            status: "SENT",
            details: JSON.stringify({ triggerType: rule.triggerType }),
            scheduledFor: scheduledAt,
            executedAt: Date.now(),
          });

          results.push({ bookingId: booking.booking_id, ruleId: rule.id, sent: true });
        }
      }
    }

    return results;
  }
}
