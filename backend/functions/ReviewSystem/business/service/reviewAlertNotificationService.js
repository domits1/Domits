import { createHash } from "node:crypto";
import { ReviewAlertRepository } from "../../data/reviewAlertRepository.js";
import { ReviewAlertRecipientRepository } from "../../data/reviewAlertRecipientRepository.js";
import { ReviewRequestNotifier } from "./reviewRequestNotifier.js";
import { ALERT_TYPES } from "../model/reviewAlertRules.js";
import { HostNotificationPreferencesRepository } from "../../../communication-preferences/data/hostNotificationPreferencesRepository.js";

const PREFERENCE_KEYS = {
  NEW_REVIEW: "manager_review_received", LOW_RATING: "manager_low_review",
};
const validId = value => typeof value === "string" && value.length <= 255 && /^[^\s\x00-\x1f\x7f]+$/.test(value);
const rating = value => typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5;

// Internal delivery boundary for ReviewAlertRules candidates; no publication hooks.
export class ReviewAlertNotificationService {
  constructor({ repository = new ReviewAlertRepository(), recipients = new ReviewAlertRecipientRepository(),
    preferences = new HostNotificationPreferencesRepository(), notifier = new ReviewRequestNotifier(),
    logger = console } = {}) {
    Object.assign(this, { repository, recipients, preferences, notifier, logger });
  }

  async deliver(event = {}) {
    try {
      if (!Object.values(ALERT_TYPES).includes(event.type) || !validId(event.propertyId)
        || (event.reviewId !== undefined && !validId(event.reviewId))
        || (event.type !== ALERT_TYPES.DECLINING_RATING && !event.reviewId)
        || typeof event.eventKey !== "string" || !event.eventKey.trim()
        || !Number.isSafeInteger(event.eventTimestamp) || event.eventTimestamp < 0
        || event.eventTimestamp > 8640000000000000) throw new TypeError("Invalid review alert.");
      // Hash the rule's deterministic identity to fit the model's bounded key.
      const eventKey = createHash("sha256").update(JSON.stringify([
        event.type, event.propertyId, event.reviewId ?? null, event.eventKey,
      ])).digest("hex");
      const content = {
        alertType: event.type, propertyId: event.propertyId,
        ...(event.reviewId ? { reviewId: event.reviewId } : {}),
        ...Object.fromEntries(["overallRating", "previousRating", "currentRating"]
          .filter(key => rating(event[key])).map(key => [key, event[key]])),
        destination: "https://domits.com/hostdashboard/reviews",
        eventTimestamp: new Date(event.eventTimestamp).toISOString(),
      };
      const results = [];
      for (const recipient of new Set(await this.recipients.resolve(event))) {
        try {
          const created = await this.repository.createAlertIfMissing({ recipient_user_id: recipient,
            property_id: event.propertyId, review_id: event.reviewId ?? null,
            alert_type: event.type, event_key: eventKey });
          if (!created) { results.push({ recipient, status: "DUPLICATE" }); continue; }
          // Persisted alert is also the durable, at-most-once email attempt claim.
          // Never retry an existing alert after lookup, transport or acknowledgement failure.
          const record = await this.preferences.findByUserId(recipient);
          const settings = JSON.parse(record?.preferences || "{}");
          const keys = [PREFERENCE_KEYS[event.type],
            ...(["LOW_RATING", "DECLINING_RATING"].includes(event.type) ? ["owner_negative_review"] : [])].filter(Boolean);
          // Existing preferences accept both legacy booleans and per-channel objects.
          if (keys.some(key => settings[key] === false || settings[key]?.email === false)) {
            results.push({ recipient, status: "EMAIL_DISABLED" }); continue;
          }
          const body = await this.notifier.invoke("GetUserInfo", { UserId: recipient });
          const users = typeof body === "string" ? JSON.parse(body) : body;
          const email = users?.[0]?.Attributes?.find(attribute => attribute.Name === "email")?.Value;
          if (!email) { results.push({ recipient, status: "EMAIL_UNAVAILABLE" }); continue; }
          await this.notifier.invoke("EmailNotificationService", { body: {
            toEmail: email, subject: `Domits review alert: ${event.type}`, body: JSON.stringify(content, null, 2),
          } });
          results.push({ recipient, status: "SENT" });
        } catch (error) {
          this.logFailure(event.type, error);
          results.push({ recipient, status: "FAILED" });
        }
      }
      return results;
    } catch (error) {
      this.logFailure(Object.values(ALERT_TYPES).includes(event?.type) ? event.type : "INVALID", error);
      return [];
    }
  }

  logFailure(alertType, error) {
    this.logger.error("Review alert notification failed", { alertType,
      code: error?.dependency ? "NOTIFICATION_DEPENDENCY_FAILED" : "DELIVERY_FAILED" });
  }
}
