import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { CognitoRepository } from "../../data/repository/cognitoRepository.js";

const MAX_SUBJECT_TITLE_LENGTH = 80;
const FALLBACK_TITLE = "your listing";

const SUBJECT_PREFIX = Object.freeze({
  APPROVED: "Your listing was approved",
  REJECTED: "Your listing was not approved",
});

const toSubjectTitle = (title) => {
  const singleLine = String(title ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SUBJECT_TITLE_LENGTH);
  return singleLine || FALLBACK_TITLE;
};

const buildBody = ({ outcome, title, reason }) => {
  const name = String(title ?? "").trim() || FALLBACK_TITLE;
  if (outcome === "APPROVED") {
    return `Hello,\n\nYour listing "${name}" was approved and is now live on Domits.\n\nOpen your Domits dashboard to view it.`;
  }
  const trimmedReason = typeof reason === "string" ? reason.trim() : "";
  const reasonBlock = trimmedReason ? `\n\nReason:\n${trimmedReason}` : "";
  return `Hello,\n\nYour listing "${name}" was not approved.${reasonBlock}\n\nYou can update your listing in your Domits dashboard and submit it for review again.`;
};

export class ListingReviewNotifier {
  constructor({
    lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || "eu-north-1" }),
    cognitoRepository = new CognitoRepository(),
  } = {}) {
    this.lambdaClient = lambdaClient;
    this.cognitoRepository = cognitoRepository;
  }

  async notifyDecision({ hostId, propertyId, title, outcome, reason } = {}) {
    if (!SUBJECT_PREFIX[outcome] || !hostId) {
      return;
    }
    try {
      const toEmail = await this.getHostEmail(hostId);
      await this.lambdaClient.send(
        new InvokeCommand({
          FunctionName: process.env.EMAIL_NOTIFICATION_LAMBDA_NAME || "EmailNotificationService",
          InvocationType: "Event",
          Payload: JSON.stringify({
            body: {
              toEmail,
              subject: `${SUBJECT_PREFIX[outcome]}: ${toSubjectTitle(title)}`,
              body: buildBody({ outcome, title, reason }),
            },
          }),
        })
      );
    } catch (error) {
      console.error("Listing review notification failed", {
        propertyId,
        outcome,
        code: error?.code || error?.name || "NOTIFICATION_FAILED",
      });
    }
  }

  async getHostEmail(hostId) {
    const user = await this.cognitoRepository.getUserById(hostId);
    const email = user?.UserAttributes?.find((attribute) => attribute.Name === "email")?.Value;
    if (!email) {
      throw new Error("No email found for this host");
    }
    return email;
  }
}
