import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

import { buildReviewInvitationEmail, httpsUrl } from "./reviewInvitationEmail.js";
import { ReviewInvitationRepository } from "../../data/reviewInvitationRepository.js";

export class ReviewRequestNotifier {
  constructor(client = new LambdaClient({ region: process.env.AWS_REGION || "eu-north-1", maxAttempts: 1 }),
    { repository = new ReviewInvitationRepository() } = {}) {
    this.client = client;
    this.repository = repository;
  }
  async invoke(FunctionName, payload) {
    const fail = (code) => Object.assign(new Error("Review notification dependency failed."), {
      code: `${FunctionName}_${code}`, dependency: FunctionName,
    });
    let result;
    try {
      result = await this.client.send(new InvokeCommand({
        FunctionName, InvocationType: "RequestResponse", Payload: Buffer.from(JSON.stringify(payload)),
      }));
    } catch {
      throw fail("TRANSPORT_FAILED");
    }
    if (result.FunctionError) throw fail("FUNCTION_FAILED");
    let response;
    try {
      response = JSON.parse(Buffer.from(result.Payload || []).toString());
    } catch {
      throw fail("INVALID_RESPONSE");
    }
    if (!Number.isInteger(response?.statusCode) || response.statusCode < 200 || response.statusCode >= 300) {
      throw fail("UNSUCCESSFUL_RESPONSE");
    }
    return response.body;
  }
  async send(booking) {

    const body = await this.invoke("GetUserInfo", { UserId: booking.guestid });
    let users;
    try { users = typeof body === "string" ? JSON.parse(body) : body; }
    catch { throw Object.assign(new Error("Guest lookup response is invalid."), {
      code: "GetUserInfo_INVALID_BODY", dependency: "GetUserInfo",
    }); }

    const email = users?.[0]?.Attributes?.find(attribute => attribute.Name === "email")?.Value;
    if (!email) throw Object.assign(new Error("Guest email is unavailable."), {
      code: "GUEST_EMAIL_UNAVAILABLE", dependency: "GetUserInfo",
    });
    const details = await this.repository.getDetails(booking.property_id);
    const imageBase = httpsUrl(process.env.EMAIL_PROPERTY_IMAGE_BASE_URL || "https://accommodation.s3.eu-north-1.amazonaws.com");
    // Encode stored object keys as path segments rather than treating them as URLs.
    const propertyImageUrl = imageBase && details.imageKey
      ? `${imageBase.replace(/\/$/, "")}/${details.imageKey.split("/").map(encodeURIComponent).join("/")}`
      : null;
    const attributes = users?.[0]?.Attributes || [];
    const guestName = attributes.find(attribute => attribute.Name === "given_name")?.Value;
    const emailContent = buildReviewInvitationEmail({
      booking, guestName, propertyTitle: details.propertyTitle, city: details.city, propertyImageUrl,
      logoUrl: process.env.EMAIL_LOGO_URL,
      frontendUrl: process.env.FRONTEND_URL || "https://domits.com",
    });
    await this.invoke("EmailNotificationService", { body: {
      toEmail: email, subject: emailContent.subject,
      body: emailContent.text, htmlBody: emailContent.html,
    } });
  }
}
