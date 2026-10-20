/**
 * Canonical backend recipient and priority rules for Finance notifications.
 *
 * Delivery channels and sending are intentionally handled by the notification
 * delivery layer; this matrix only defines which stakeholder roles are in scope
 * for each event and the priority assigned by issue #3528.
 */
const createRule = (eventType, label, recipients, priority) =>
  Object.freeze({
    domain: "FINANCE",
    eventType,
    label,
    recipients: Object.freeze(recipients),
    priority,
  });

export const FINANCE_NOTIFICATION_MATRIX = Object.freeze([
  createRule("GUEST_PAYMENT_RECEIVED", "Guest payment received", ["FINANCE", "OWNER", "MANAGER"], "P3"),
  createRule("PAYMENT_FAILED", "Payment failed", ["FINANCE", "MANAGER"], "P1"),
  createRule("REFUND_INITIATED", "Refund initiated", ["FINANCE", "OWNER", "MANAGER"], "P2"),
  createRule("REFUND_COMPLETED", "Refund completed", ["FINANCE", "OWNER", "MANAGER"], "P3"),
  createRule("OWNER_PAYOUT_GENERATED", "Owner payout generated", ["FINANCE", "OWNER", "MANAGER"], "P3"),
  createRule("OWNER_PAYOUT_FAILED", "Owner payout failed", ["FINANCE", "OWNER", "MANAGER", "DOMITS_ADMIN"], "P1"),
  createRule("COMMISSION_CALCULATED", "Commission calculated", ["FINANCE", "OWNER", "MANAGER"], "P3"),
  // The source matrix says P0/P1; keep the ambiguity visible instead of guessing a single priority.
  createRule("RECONCILIATION_MISMATCH", "Reconciliation mismatch", ["FINANCE", "MANAGER", "DOMITS_ADMIN"], "P0/P1"),
  createRule("UNMATCHED_TRANSACTION", "Unmatched transaction", ["FINANCE", "MANAGER", "DOMITS_ADMIN"], "P1"),
  createRule("CHARGEBACK", "Chargeback", ["FINANCE", "OWNER", "MANAGER", "DOMITS_ADMIN"], "P1"),
  createRule("TAX_REPORTING_EVENT", "Tax/reporting event", ["FINANCE", "OWNER", "MANAGER"], "P2"),
  createRule("ACCOUNTING_EXPORT_FAILED", "Accounting export failed", ["FINANCE", "MANAGER", "DOMITS_ADMIN"], "P1"),
]);

const rulesByEventType = new Map(FINANCE_NOTIFICATION_MATRIX.map((rule) => [rule.eventType, rule]));

export const normalizeFinanceNotificationEventType = (eventType) => {
  if (typeof eventType !== "string") return "";

  return eventType
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
};

/**
 * Returns the immutable rule for a known event, or null for an unknown event.
 * Unknown events must not silently inherit a broad recipient list or priority.
 */
export const getFinanceNotificationRule = (eventType) =>
  rulesByEventType.get(normalizeFinanceNotificationEventType(eventType)) ?? null;
