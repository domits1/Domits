import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const parsePayload = (payload) => {
  if (!payload) return null;
  const decoded = JSON.parse(Buffer.from(payload).toString("utf8"));
  if (typeof decoded?.body === "string") return { ...decoded, body: JSON.parse(decoded.body) };
  return decoded;
};

export default class UnifiedMessagingClient {
  constructor({ client = new LambdaClient({ region: process.env.AWS_REGION || "eu-north-1" }) } = {}) {
    this.client = client;
    this.functionName = process.env.UNIFIED_MESSAGING_LAMBDA_NAME || "UnifiedMessaging";
  }

  async sendAutomatedDomitsMessage(context) {
    const response = await this.client.send(
      new InvokeCommand({
        FunctionName: this.functionName,
        InvocationType: "RequestResponse",
        Payload: Buffer.from(
          JSON.stringify({
            source: "domits.automated-messaging",
            action: "SEND_AUTOMATED_DOMITS_MESSAGE",
            detail: context,
          })
        ),
      })
    );

    const parsed = parsePayload(response?.Payload);
    if (response?.FunctionError || Number(parsed?.statusCode || 500) >= 400) {
      const error = new Error("Domits Direct delivery failed.");
      error.code = parsed?.body?.error || "DOMITS_DIRECT_DELIVERY_FAILED";
      throw error;
    }

    const body = parsed?.body ?? parsed?.response ?? parsed;
    const messageId = body?.id || body?.messageId || null;
    if (!messageId) throw new Error("Domits Direct delivery did not return a message ID.");
    return {
      messageId,
      threadId: body?.threadId || null,
      reused: body?.reused === true,
      diagnostic: body?.diagnostic || null,
    };
  }
}
