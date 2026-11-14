import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

export class ReviewRequestNotifier {
  constructor(client = new LambdaClient({ region: process.env.AWS_REGION || "eu-north-1", maxAttempts: 1 })) {
    this.client = client;
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
    const url = new URL("/review", process.env.FRONTEND_URL || "http://localhost:3000");
    // After the deployment, switch to "https://domits.com" 
    url.searchParams.set("bookingId", booking.id);
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
    await this.invoke("EmailNotificationService", { body: {
      toEmail: email, subject: "How was your stay?",
      body: `Share your experience with your recent stay:\n${url.href}`,
    } });
  }
}
