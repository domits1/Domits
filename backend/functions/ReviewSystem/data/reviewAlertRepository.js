import { randomUUID } from "node:crypto";
import Database from "database";
import { Review_Alert } from "database/models/Review_Alert";
import { ALERT_TYPES } from "../business/model/reviewAlertRules.js";

const STATUSES = ["UNREAD", "READ", "DISMISSED"];
function text(value, name) {
  if (typeof value !== "string" || !value.trim() || value.length > 255) throw new TypeError(`Invalid ${name}.`);
  return value;
}

// No existence check: PostgreSQL arbitrates simultaneous inserts using the unique constraint.
// Return true only for the worker that created the alert; duplicates preserve read/dismiss state.
export class ReviewAlertRepository {
  constructor({ getDatabase = () => Database.getInstance(), now = Date.now } = {}) {
    this.getDatabase = getDatabase;
    this.now = now;
  }

  async execute(operation) {
    const database = await this.getDatabase();
    for (let attempt = 0; ; attempt++) {
      try { return await operation(database.getRepository(Review_Alert)); }
      catch (error) {
        if (attempt >= 2 || !["40001", "OC001"].includes((error.driverError ?? error).code)) throw error;
      }
    }
  }

  async createAlertIfMissing({ recipient_user_id, property_id, review_id = null, alert_type, event_key }) {
    text(recipient_user_id, "recipient"); text(property_id, "property"); text(event_key, "event key");
    if (review_id !== null) text(review_id, "review");
    if (!Object.values(ALERT_TYPES).includes(alert_type)) throw new TypeError("Invalid alert type.");
    const now = this.now();
    const row = { id: randomUUID(), recipient_user_id, property_id, review_id, alert_type, event_key,
      status: "UNREAD", created_at: now, updated_at: now };
    return this.execute(async (repository) => {
      const result = await repository.createQueryBuilder().insert().values(row)
        .onConflict('("recipient_user_id", "event_key") DO NOTHING').returning("id").execute();
      return result.raw.length > 0;
    });
  }

  async getAlertsForRecipient(recipientUserId, { status, limit = 50, offset = 0 } = {}) {
    text(recipientUserId, "recipient");
    if (status !== undefined && !STATUSES.includes(status)) throw new TypeError("Invalid alert status.");
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100
      || !Number.isSafeInteger(offset) || offset < 0) throw new TypeError("Invalid pagination.");
    return this.execute((repository) => repository.find({
      where: { recipient_user_id: recipientUserId, ...(status === undefined ? {} : { status }) },
      order: { created_at: "DESC", id: "DESC" }, take: limit, skip: offset,
    }));
  }

  async changeStatus(recipientUserId, alertId, status, from) {
    text(recipientUserId, "recipient"); text(alertId, "alert ID");
    const now = this.now();
    return this.execute(async (repository) => {
      const result = await repository.createQueryBuilder().update()
        .set({ status, updated_at: () => 'GREATEST("updated_at" + 1, :now)' }).setParameter("now", now)
        .where("id = :alertId AND recipient_user_id = :recipientUserId", { alertId, recipientUserId })
        .andWhere("status IN (:...from)", { from }).execute();
      return result.affected > 0;
    });
  }

  markAlertAsRead(recipientUserId, alertId) {
    return this.changeStatus(recipientUserId, alertId, "READ", ["UNREAD"]);
  }

  dismissAlert(recipientUserId, alertId) {
    return this.changeStatus(recipientUserId, alertId, "DISMISSED", ["UNREAD", "READ"]);
  }
}
