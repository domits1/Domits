import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import getHostEmailById from "./getHostEmailById.js";
import FinanceNotificationRepository from "../data/financeNotificationRepository.js";
import { getFinanceNotificationRule } from "../.shared/financeNotificationMatrix.js";

const financeNotificationClient = new LambdaClient({ region: process.env.AWS_REGION || "eu-north-1" });

const isValidFinanceEmail = (email) => {
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1] || /\s/.test(email)) return false;
  const domainParts = parts[1].split(".");
  return domainParts.length > 1 && domainParts.every(Boolean);
};

const normalizeFinanceEmails = (emails) => [
  ...new Set(
    emails
      .map((email) => String(email || "").trim().toLowerCase())
      .filter(isValidFinanceEmail)
  ),
];

const resolveFinanceNotificationPriority = (contextPriority, rulePriority) => {
  if (contextPriority === "P0" || contextPriority === "P1") return contextPriority;
  if (rulePriority === "P0/P1") return "P1";
  return rulePriority;
};

class FinanceNotificationService {
  constructor({
    financeNotificationRepository = new FinanceNotificationRepository(),
    getHostEmailByIdFn = getHostEmailById,
    lambdaClient = financeNotificationClient,
  } = {}) {
    this.financeNotificationRepository = financeNotificationRepository;
    this.getHostEmailById = getHostEmailByIdFn;
    this.lambdaClient = lambdaClient;
  }

  async getOwnerEmail(hostId) {
    try {
      return await this.getHostEmailById(hostId);
    } catch (error) {
      console.error("Finance notification owner lookup failed", { code: error?.code || error?.name || "LOOKUP_FAILED" });
      return null;
    }
  }

  isTeamMemberForRoles(member, roles) {
    const role = String(member?.role || "").trim();
    const isFinanceMember = roles.includes("FINANCE") && role === "Financial Manager";
    const isManager = roles.includes("MANAGER") && role.endsWith("Manager") && role !== "Financial Manager";
    return isFinanceMember || isManager;
  }

  async getTeamEmails(hostId, roles) {
    try {
      const members = await this.financeNotificationRepository.getActiveTeamMembers(hostId);
      return members.filter((member) => this.isTeamMemberForRoles(member, roles)).map((member) => member.member_email);
    } catch (error) {
      console.error("Finance notification team lookup failed", { code: error?.code || error?.name || "LOOKUP_FAILED" });
      return [];
    }
  }

  async resolveRecipients(hostId, roles) {
    const recipients = [];

    if (hostId && roles.includes("OWNER")) {
      recipients.push(await this.getOwnerEmail(hostId));
    }

    if (hostId && (roles.includes("FINANCE") || roles.includes("MANAGER"))) {
      recipients.push(...await this.getTeamEmails(hostId, roles));
    }

    if (roles.includes("DOMITS_ADMIN")) {
      recipients.push(...String(process.env.DOMITS_FINANCE_ADMIN_EMAILS || "").split(","));
    }

    return normalizeFinanceEmails(recipients);
  }

  async send(eventType, context = {}) {
    const rule = getFinanceNotificationRule(eventType);
    if (!rule) return;

    try {
      const recipients = await this.resolveRecipients(context.hostId, rule.recipients);
      if (!recipients.length) return;
      const priority = resolveFinanceNotificationPriority(context.priority, rule.priority);
      const references = [
        ["Booking", context.bookingId],
        ["Property", context.propertyId],
        ["Payment", context.paymentId],
        ["Refund", context.refundId],
        ["Payout", context.payoutId],
        ["Transaction", context.transactionId],
      ].filter(([, value]) => value !== undefined && value !== null && String(value).trim());
      const body = [
        `Event: ${rule.label}`,
        `Priority: ${priority}`,
        ...references.map(([label, value]) => `${label}: ${value}`),
        "",
        "Review the relevant records in your Domits dashboard.",
      ].join("\n");
      const results = await Promise.allSettled(recipients.map(async (toEmail) =>
        this.lambdaClient.send(new InvokeCommand({
          FunctionName: process.env.EMAIL_NOTIFICATION_LAMBDA_NAME || "EmailNotificationService",
          InvocationType: "Event",
          Payload: Buffer.from(JSON.stringify({
            body: {
              toEmail,
              subject: `Domits Finance: ${rule.label} (${priority})`,
              body,
            },
          })),
        }))
      ));
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed) console.error("Finance notification delivery failed", { eventType, failed });
    } catch (error) {
      console.error("Finance notification dispatch failed", { eventType, code: error?.code || error?.name || "DELIVERY_FAILED" });
    }
  }
}

const financeNotificationService = new FinanceNotificationService();

export const sendFinanceNotification = (eventType, context = {}) =>
  financeNotificationService.send(eventType, context);

export default FinanceNotificationService;
