import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { CognitoRepository } from "../../data/repository/cognitoRepository.js";
import { withinTimeLimit } from "../../util/timeLimit.js";

// The review response waits on this notice, so a hung Cognito or Lambda call must not hold up an approve or reject.
// One budget covers the lookup and the invoke together. 3000 ms matches the other single dependent read in this
// function (WEBSITE_PLAN_READ_TIMEOUT_MS): an AdminGetUser plus an async invoke normally take well under a second,
// and the notice is best effort, so waiting longer buys nothing. It also sits far below API Gateway's 29 s limit.
export const NOTIFICATION_TIMEOUT_MS = 3000;
const NOTIFICATION_TIMEOUT_CODE = "NOTIFICATION_TIMEOUT";
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
      await withinTimeLimit(
        this.sendDecisionEmail({ hostId, title, outcome, reason }),
        NOTIFICATION_TIMEOUT_MS,
        () => Object.assign(new Error("Listing review notification timed out."), { code: NOTIFICATION_TIMEOUT_CODE })
      );
    } catch (error) {
      console.error("Listing review notification failed", {
        propertyId,
        outcome,
        code: error?.code || error?.name || "NOTIFICATION_FAILED",
      });
    }
  }

  async sendDecisionEmail({ hostId, title, outcome, reason }) {
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
