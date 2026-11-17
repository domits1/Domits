import { describe, expect, test } from "@jest/globals";
import {
  FINANCE_NOTIFICATION_MATRIX,
  getFinanceNotificationRule,
  normalizeFinanceNotificationEventType,
} from "../../functions/.shared/financeNotificationMatrix.js";

const expectedRules = [
  { eventType: "GUEST_PAYMENT_RECEIVED", recipients: ["FINANCE", "OWNER", "MANAGER"], priority: "P3" },
  { eventType: "PAYMENT_FAILED", recipients: ["FINANCE", "MANAGER"], priority: "P1" },
  { eventType: "REFUND_INITIATED", recipients: ["FINANCE", "OWNER", "MANAGER"], priority: "P2" },
  { eventType: "REFUND_COMPLETED", recipients: ["FINANCE", "OWNER", "MANAGER"], priority: "P3" },
  { eventType: "OWNER_PAYOUT_GENERATED", recipients: ["FINANCE", "OWNER", "MANAGER"], priority: "P3" },
  { eventType: "OWNER_PAYOUT_FAILED", recipients: ["FINANCE", "OWNER", "MANAGER", "DOMITS_ADMIN"], priority: "P1" },
  { eventType: "COMMISSION_CALCULATED", recipients: ["FINANCE", "OWNER", "MANAGER"], priority: "P3" },
  { eventType: "RECONCILIATION_MISMATCH", recipients: ["FINANCE", "MANAGER", "DOMITS_ADMIN"], priority: "P0/P1" },
  { eventType: "UNMATCHED_TRANSACTION", recipients: ["FINANCE", "MANAGER", "DOMITS_ADMIN"], priority: "P1" },
  { eventType: "CHARGEBACK", recipients: ["FINANCE", "OWNER", "MANAGER", "DOMITS_ADMIN"], priority: "P1" },
  { eventType: "TAX_REPORTING_EVENT", recipients: ["FINANCE", "OWNER", "MANAGER"], priority: "P2" },
  { eventType: "ACCOUNTING_EXPORT_FAILED", recipients: ["FINANCE", "MANAGER", "DOMITS_ADMIN"], priority: "P1" },
];

describe("Finance notification matrix", () => {
  test("matches all recipient and priority rules from issue #3528", () => {
    expect(FINANCE_NOTIFICATION_MATRIX.map(({ eventType, recipients, priority }) => ({
      eventType,
      recipients: [...recipients],
      priority,
    }))).toEqual(expectedRules);
    expect(new Set(FINANCE_NOTIFICATION_MATRIX.map(({ eventType }) => eventType)).size).toBe(12);
  });

  test.each([
    [" guest payment received ", "GUEST_PAYMENT_RECEIVED"],
    ["guestPaymentReceived", "GUEST_PAYMENT_RECEIVED"],
    ["tax/reporting event", "TAX_REPORTING_EVENT"],
    ["Accounting export failed", "ACCOUNTING_EXPORT_FAILED"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeFinanceNotificationEventType(input)).toBe(expected);
    expect(getFinanceNotificationRule(input)?.eventType).toBe(expected);
  });

  test("returns null for unknown or non-string events instead of notifying everyone by default", () => {
    expect(getFinanceNotificationRule("UNKNOWN_FINANCE_EVENT")).toBeNull();
    expect(getFinanceNotificationRule("")).toBeNull();
    expect(getFinanceNotificationRule(undefined)).toBeNull();
    expect(normalizeFinanceNotificationEventType(null)).toBe("");
  });

  test("keeps the matrix and each recipient list immutable", () => {
    expect(Object.isFrozen(FINANCE_NOTIFICATION_MATRIX)).toBe(true);

    for (const rule of FINANCE_NOTIFICATION_MATRIX) {
      expect(Object.isFrozen(rule)).toBe(true);
      expect(Object.isFrozen(rule.recipients)).toBe(true);
    }
  });
});
