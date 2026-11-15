import { ReviewAlertRepository } from "../../data/reviewAlertRepository.js";
import { BadRequestException } from "../../util/exception/badRequestException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";
import { assertCaller } from "../model/reviewRules.js";

const FIELDS = ["id", "alert_type", "property_id", "review_id", "status", "created_at", "updated_at"];
const display = alert => ({ ...Object.fromEntries(FIELDS.map(key => [key, alert[key] ?? null])),
  display: { destination: "/hostdashboard/reviews" } });
const invalid = message => { throw new BadRequestException(message); };
function pageNumber(value, fallback, minimum, maximum) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) invalid("Invalid pagination parameter.");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) invalid("Invalid pagination parameter.");
  return parsed;
}

export class ReviewAlertService {
  constructor({ repository = new ReviewAlertRepository() } = {}) { this.repository = repository; }

  async list(recipient, query = {}) {
    assertCaller(recipient);
    if (Object.keys(query).some(key => !["status", "limit", "offset"].includes(key))) invalid("Unsupported alert query parameter.");
    const { status } = query;
    if (status !== undefined && !["UNREAD", "READ", "DISMISSED"].includes(status)) invalid("Invalid alert status.");
    const limit = pageNumber(query.limit, 50, 1, 100);
    const offset = pageNumber(query.offset, 0, 0, Number.MAX_SAFE_INTEGER);
    const [alerts, unreadCount] = await Promise.all([
      this.repository.getAlertsForRecipient(recipient, { status, limit, offset }),
      this.repository.countUnreadForRecipient(recipient),
    ]);
    return { alerts: alerts.map(display), unread_count: unreadCount, limit, offset };
  }

  async update(recipient, id, action) {
    assertCaller(recipient);
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,255}$/.test(id)) invalid("Invalid alert ID.");
    if (!["read", "dismiss"].includes(action)) invalid("Invalid alert action.");
    if (action === "read") await this.repository.markAlertAsRead(recipient, id);
    else await this.repository.dismissAlert(recipient, id);
    // An unchanged row is an idempotent success; dismissed alerts are never reopened.
    const alert = await this.repository.findAlertForRecipient(recipient, id);
    if (!alert) throw new NotFoundException("Review alert not found.");
    return { alert: display(alert) };
  }
}
