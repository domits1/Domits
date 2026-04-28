import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const REGION = process.env.AWS_REGION || "eu-north-1";
const FUNCTION_NAME =
  process.env.WEBSOCKET_MESSAGE_LAMBDA_NAME || "General-Messaging-Production-Create-WebSocketMessage";

const lambdaClient = new LambdaClient({ region: REGION });

export default async function publishRealtimeMessage(message) {
  if (!message || typeof message !== "object") return;

  const senderId = message.senderId || message.userId || null;
  const recipientId = message.recipientId || null;

  if (!senderId || !recipientId) {
    return;
  }

  const websocketBody = {
    type: "message",
    senderId,
    userId: senderId,
    recipientId,
    text: message.text || message.content || "",
    content: message.content || message.text || "",
    fileUrls: Array.isArray(message.fileUrls) ? message.fileUrls : [],
    attachments: message.attachments || null,
    propertyId: message.propertyId || null,
    threadId: message.threadId || null,
    platform: message.platform || "DOMITS",
    integrationAccountId: message.integrationAccountId || null,
    externalThreadId: message.externalThreadId || null,
    metadata: message.metadata || {},
    createdAt: message.createdAt || Date.now(),
  };

  const lambdaEvent = {
    requestContext: {
      routeKey: "sendMessage",
      connectionId: "unified-messaging-internal",
    },
    body: JSON.stringify(websocketBody),
  };

  try {
    const response = await lambdaClient.send(
      new InvokeCommand({
        FunctionName: FUNCTION_NAME,
        Payload: Buffer.from(JSON.stringify(lambdaEvent)),
      })
    );

    let parsedPayload = null;
    try {
      parsedPayload = response?.Payload
        ? JSON.parse(Buffer.from(response.Payload).toString("utf8"))
        : null;
    } catch {
      parsedPayload = null;
    }
  } catch (error) {
    console.error("publishRealtimeMessage failed", error);
    throw error;
  }
}
