import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "eu-north-1" });
const UNIFIED_MESSAGING_LAMBDA_NAME = process.env.UNIFIED_MESSAGING_LAMBDA_NAME || "UnifiedMessaging";

const decodePayload = async (payload) => {
  if (!payload) return null;
  const raw = new TextDecoder("utf-8").decode(payload);
  if (!raw) return null;

  const parsed = JSON.parse(raw);
  return parsed;
};

const sendAutomatedMessage = async ({
  senderId,
  recipientId,
  propertyId = null,
  messageText,
  messageType,
  hostId = null,
  guestId = null,
  platform = "DOMITS",
  integrationAccountId = null,
  externalThreadId = null,
  threadId = null,
  metadata = {},
}) => {
  const event = {
    httpMethod: "POST",
    path: "/send",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      senderId,
      recipientId,
      propertyId,
      threadId,
      hostId,
      guestId,
      content: messageText,
      platform,
      integrationAccountId,
      externalThreadId,
      metadata: {
        isAutomated: true,
        messageType: messageType || "automated_message",
        ...metadata,
      },
    }),
  };

  const response = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: UNIFIED_MESSAGING_LAMBDA_NAME,
      Payload: JSON.stringify(event),
    })
  );

  const result = await decodePayload(response?.Payload);
  const statusCode = Number(result?.statusCode || 500);

  if (statusCode >= 400) {
    throw new Error(`Automated send failed with status ${statusCode}`);
  }

  if (typeof result?.body === "string") {
    try {
      return JSON.parse(result.body);
    } catch {
      return { rawBody: result.body };
    }
  }

  return result?.body || result;
};

export default sendAutomatedMessage;
