import { badRequest } from "../util/httpErrors.js";

export const normalizeChannexInboundMessage = (webhookEvent, context) => {
  const payload = webhookEvent?.payload || {};

  if (payload.sender !== "guest") {
    return null;
  }

  if (!payload.id) {
    throw badRequest("Channex message payload.id is required.");
  }

  if (!payload.message_thread_id) {
    throw badRequest("Channex message payload.message_thread_id is required.");
  }

  const guestId = context?.guestId ?? `CHANNEX_GUEST_THREAD:${payload.message_thread_id}`;

  return {
    integrationAccountId: context?.integrationAccountId,
    platform: "CHANNEX",
    externalThreadId: payload.message_thread_id,
    hostId: context?.hostId,
    guestId,
    propertyId: context?.propertyId ?? null,
    status: "OPEN",
    messages: [
      {
        platformMessageId: payload.id,
        senderId: guestId,
        recipientId: context?.hostId,
        content: payload.message ?? "",
        externalCreatedAt: new Date(webhookEvent.timestamp).getTime(),
        direction: "INBOUND",
        externalSenderType: "GUEST",
        metadata: {
          channexAttachments: payload.attachments ?? [],
          channexHaveAttachment: Boolean(payload.have_attachment),
        },
        attachments: null,
      },
    ],
  };
};
