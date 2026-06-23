import MessageRepository from "../data/messageRepository.js";
import ThreadRepository, { isDomitsBookingThreadUniqueError } from "../data/threadRepository.js";
import BookingRepository from "../data/bookingRepository.js";
import WhatsAppProviderAdapter from "./whatsappProviderAdapter.js";
import publishRealtimeMessage from "./publishRealtimeMessage.js";
import { badRequest, forbidden, notFound } from "../util/httpErrors.js";

const isWhatsAppPayload = (payload) => payload.platform === "WHATSAPP";
const resolveParticipantId = (explicitId, fallbackId) => explicitId || fallbackId;

const buildExternalThreadPayload = (payload, senderId, recipientId) => ({
  integrationAccountId: payload.integrationAccountId,
  platform: payload.platform,
  externalThreadId: payload.externalThreadId,
  hostId: resolveParticipantId(payload.hostId || null, senderId),
  guestId: resolveParticipantId(payload.guestId || null, recipientId),
  propertyId: payload.propertyId ?? null,
  status: "OPEN",
});

const buildThreadPayload = (payload, senderId, recipientId) => ({
  hostId: resolveParticipantId(payload.hostId || null, senderId),
  guestId: resolveParticipantId(payload.guestId || null, recipientId),
  propertyId: payload.propertyId ?? null,
  bookingId: payload.bookingId ?? null,
  platform: payload.platform || "DOMITS",
  externalThreadId: payload.externalThreadId,
  integrationAccountId: payload.integrationAccountId ?? null,
});

const idsEqual = (left, right) => String(left || "") === String(right || "");

const getThreadBookingId = (thread) => thread?.bookingId || thread?.bookingid || null;

const validateBookingMatchesThread = (booking, thread, authenticatedUserId) => {
  if (!booking) return false;
  if (!idsEqual(booking.guestid, authenticatedUserId)) return false;
  if (!idsEqual(booking.hostid, thread?.hostId)) return false;
  if (thread?.propertyId && !idsEqual(booking.property_id, thread.propertyId)) return false;
  return true;
};

const normalizeThread = (thread) => {
  if (!thread) return null;
  return {
    ...thread,
    bookingId: getThreadBookingId(thread),
  };
};

const buildWhatsAppFailureResult = (payload, recipientId, error) => ({
  accepted: false,
  mode: "live",
  channel: "WHATSAPP",
  integrationAccountId: payload.integrationAccountId ?? null,
  externalAccountId: null,
  recipientWhatsAppId: recipientId,
  messageType: Array.isArray(payload.attachments) && payload.attachments.length > 0 ? "media" : "text",
  text: payload.content || "",
  error: error?.message || String(error),
  details: error?.details || null,
});

const buildStoredMetadata = (payload, providerResult) => {
  if (!isWhatsAppPayload(payload)) {
    return payload.metadata;
  }

  const baseMetadata =
    typeof payload.metadata === "string" ? { rawMetadata: payload.metadata } : payload.metadata || {};

  return JSON.stringify({
    ...baseMetadata,
    providerResult,
  });
};

class MessageService {
  constructor({ realtimePublisher = publishRealtimeMessage } = {}) {
    this.messageRepository = new MessageRepository();
    this.threadRepository = new ThreadRepository();
    this.bookingRepository = new BookingRepository();
    this.whatsAppProviderAdapter = new WhatsAppProviderAdapter();
    this.realtimePublisher = realtimePublisher;
  }

  async resolveDomitsBookingThread(payload, senderId, recipientId) {
    const existing = await this.threadRepository.findThreadByBookingId(payload.bookingId);
    if (existing) return existing;

    try {
      return await this.threadRepository.createThread(buildThreadPayload(payload, senderId, recipientId));
    } catch (error) {
      if (!isDomitsBookingThreadUniqueError(error)) throw error;

      const racedThread = await this.threadRepository.findThreadByBookingId(payload.bookingId);
      if (!racedThread) throw error;

      return racedThread;
    }
  }

  async resolveThread(payload, senderId, recipientId) {
    let threadId = payload.threadId || null;
    let thread = null;
    const shouldUpsertExternalThread =
      isWhatsAppPayload(payload) && payload.integrationAccountId && payload.externalThreadId;

    if (!threadId) {
      if (shouldUpsertExternalThread) {
        thread = await this.threadRepository.upsertExternalThread(buildExternalThreadPayload(payload, senderId, recipientId));
      } else {
        thread = payload.bookingId
          ? await this.resolveDomitsBookingThread(payload, senderId, recipientId)
          : await this.threadRepository.findThread(senderId, recipientId, payload.propertyId);
        if (!thread) {
          thread = await this.threadRepository.createThread(buildThreadPayload(payload, senderId, recipientId));
        }
      }

      return { thread, threadId: thread.id };
    }

    if (shouldUpsertExternalThread) {
      thread = await this.threadRepository.upsertExternalThread(buildExternalThreadPayload(payload, senderId, recipientId));
      threadId = thread.id;
    }

    return { thread, threadId };
  }

  async loadBookingOr404(bookingId) {
    const booking = await this.bookingRepository.getBookingById(bookingId);
    if (!booking) throw notFound("Booking not found.");
    return booking;
  }

  async getMatchingLegacyBookings(thread, authenticatedUserId) {
    if (!thread?.hostId) return [];
    if (!thread?.propertyId) {
      return await this.bookingRepository.findBookingsForGuestHost({
        guestId: authenticatedUserId,
        hostId: thread.hostId,
      });
    }
    return await this.bookingRepository.findBookingsForGuestHostProperty({
      guestId: authenticatedUserId,
      hostId: thread.hostId,
      propertyId: thread.propertyId,
    });
  }

  async assertGuestThreadReservationAccess(thread, authenticatedUserId) {
    const bookingId = getThreadBookingId(thread);

    if (bookingId) {
      const booking = await this.loadBookingOr404(bookingId);
      if (!validateBookingMatchesThread(booking, thread, authenticatedUserId)) {
        throw forbidden("This conversation is not connected to one of your reservations.");
      }
      return booking;
    }

    const matches = await this.getMatchingLegacyBookings(thread, authenticatedUserId);
    if (matches.length === 0) {
      throw forbidden("This conversation is not connected to one of your reservations.");
    }

    if (matches.length > 1) {
      throw forbidden("This legacy conversation matches multiple reservations.");
    }

    return matches[0];
  }

  async assertThreadAccess(thread, authenticatedUser) {
    if (!thread) throw notFound("Thread not found.");

    const userId = authenticatedUser.userId;
    if (idsEqual(thread.hostId, userId)) {
      return { role: "host", thread: normalizeThread(thread), booking: null };
    }

    if (idsEqual(thread.guestId, userId)) {
      const booking = await this.assertGuestThreadReservationAccess(thread, userId);
      return { role: "guest", thread: normalizeThread(thread), booking };
    }

    throw forbidden("You are not a participant in this conversation.");
  }

  assertNoSpoofedSender(payload, authenticatedUserId) {
    if (payload.senderId && !idsEqual(payload.senderId, authenticatedUserId)) {
      throw forbidden("senderId does not match the authenticated user.");
    }
  }

  assertConsistentOptionalId(value, expected, label) {
    if (value !== undefined && value !== null && !idsEqual(value, expected)) {
      throw forbidden(`${label} does not match the authorized conversation context.`);
    }
  }

  validateMessagePayload(payload) {
    const content = String(payload?.content || payload?.text || "");
    const attachments = Array.isArray(payload?.attachments) ? payload.attachments : null;
    if (!content.trim() && (!attachments || attachments.length === 0)) {
      throw badRequest("Message content or attachment is required.");
    }
  }

  async sendWhatsAppMessage(payload, recipientId) {
    try {
      const providerResult = await this.whatsAppProviderAdapter.sendMessage({
        integrationAccountId: payload.integrationAccountId,
        recipientId,
        content: payload.content,
        attachments: payload.attachments,
      });

      return {
        providerResult,
        platformMessageId: providerResult?.providerMessageId || null,
        deliveryStatus: "sent",
        errorCode: null,
        errorMessage: null,
      };
    } catch (error) {
      return {
        providerResult: buildWhatsAppFailureResult(payload, recipientId, error),
        platformMessageId: payload.platformMessageId ?? null,
        deliveryStatus: "failed",
        errorCode: error?.code || "WHATSAPP_SEND_FAILED",
        errorMessage: error?.message || "WhatsApp send failed",
      };
    }
  }

  async resolveExistingThreadMessageContext(payload, authenticatedUser, senderId) {
    const threadId = payload.threadId;
    const thread = await this.threadRepository.getThreadById(threadId);
    const access = await this.assertThreadAccess(thread, authenticatedUser);
    const recipientId = idsEqual(access.thread.hostId, senderId) ? access.thread.guestId : access.thread.hostId;

    this.assertConsistentOptionalId(payload.recipientId, recipientId, "recipientId");
    this.assertConsistentOptionalId(payload.hostId, access.thread.hostId, "hostId");
    this.assertConsistentOptionalId(payload.guestId, access.thread.guestId, "guestId");
    this.assertConsistentOptionalId(payload.propertyId, access.thread.propertyId, "propertyId");
    this.assertConsistentOptionalId(payload.bookingId, getThreadBookingId(access.thread), "bookingId");

    return {
      senderId,
      recipientId,
      threadId,
      resolvedPayload: {
        ...payload,
        senderId,
        recipientId,
        hostId: access.thread.hostId,
        guestId: access.thread.guestId,
        propertyId: access.thread.propertyId ?? null,
        bookingId: getThreadBookingId(access.thread),
        platform: access.thread.platform || payload.platform || "DOMITS",
        integrationAccountId: access.thread.integrationAccountId ?? payload.integrationAccountId ?? null,
        externalThreadId: access.thread.externalThreadId ?? payload.externalThreadId ?? null,
      },
    };
  }

  async resolveBookingMessageContext(payload, senderId) {
    const booking = await this.loadBookingOr404(payload.bookingId);
    const isGuestStarter = idsEqual(booking.guestid, senderId);
    const isHostStarter = idsEqual(booking.hostid, senderId);

    if (!isGuestStarter && !isHostStarter) {
      throw forbidden("This booking does not belong to the authenticated user.");
    }

    const hostId = booking.hostid;
    const guestId = booking.guestid;
    const recipientId = isGuestStarter ? hostId : guestId;

    this.assertConsistentOptionalId(payload.recipientId, recipientId, "recipientId");
    this.assertConsistentOptionalId(payload.hostId, hostId, "hostId");
    this.assertConsistentOptionalId(payload.guestId, guestId, "guestId");
    this.assertConsistentOptionalId(payload.propertyId, booking.property_id, "propertyId");

    return {
      senderId,
      recipientId,
      threadId: null,
      resolvedPayload: {
        ...payload,
        senderId,
        recipientId,
        hostId,
        guestId,
        propertyId: booking.property_id,
        bookingId: booking.id,
        platform: payload.platform || "DOMITS",
      },
    };
  }

  resolveHostMessageContext(payload, authenticatedUser, senderId) {
    const recipientId = payload.recipientId;

    if (!authenticatedUser.isHost) {
      throw badRequest("bookingId is required to start a guest conversation.");
    }

    if (!recipientId || idsEqual(recipientId, senderId)) {
      throw badRequest("recipientId is required.");
    }

    this.assertConsistentOptionalId(payload.hostId, senderId, "hostId");
    return {
      senderId,
      recipientId,
      threadId: null,
      resolvedPayload: {
        ...payload,
        senderId,
        recipientId,
        hostId: senderId,
        guestId: payload.guestId || recipientId,
        propertyId: payload.propertyId ?? null,
        bookingId: null,
        platform: payload.platform || "DOMITS",
      },
    };
  }

  async resolveMessageContext(payload, authenticatedUser) {
    const senderId = authenticatedUser.userId;

    if (payload.threadId) {
      return await this.resolveExistingThreadMessageContext(payload, authenticatedUser, senderId);
    }

    if (payload.bookingId) {
      return await this.resolveBookingMessageContext(payload, senderId);
    }

    return this.resolveHostMessageContext(payload, authenticatedUser, senderId);
  }

  async sendMessage(payload, authenticatedUser) {
    if (!payload || typeof payload !== "object") throw badRequest("Request body is required.");
    this.validateMessagePayload(payload);
    this.assertNoSpoofedSender(payload, authenticatedUser.userId);

    const { senderId, recipientId, threadId, resolvedPayload } = await this.resolveMessageContext(
      payload,
      authenticatedUser
    );

    const { threadId: resolvedThreadId } = threadId
      ? { threadId }
      : await this.resolveThread(resolvedPayload, senderId, recipientId);

    let providerResult = null;
    let platformMessageId = resolvedPayload.platformMessageId ?? null;
    let deliveryStatus = isWhatsAppPayload(resolvedPayload) ? "pending" : "delivered";
    let errorCode = null;
    let errorMessage = null;

    if (isWhatsAppPayload(resolvedPayload)) {
      const sendResult = await this.sendWhatsAppMessage(resolvedPayload, recipientId);
      providerResult = sendResult.providerResult;
      platformMessageId = sendResult.platformMessageId;
      deliveryStatus = sendResult.deliveryStatus;
      errorCode = sendResult.errorCode;
      errorMessage = sendResult.errorMessage;
    }

    const messageContent = resolvedPayload.content ?? resolvedPayload.text ?? "";

    const message = await this.messageRepository.createMessage({
      threadId: resolvedThreadId,
      senderId,
      recipientId,
      content: messageContent,
      platformMessageId,
      metadata: buildStoredMetadata(resolvedPayload, providerResult),
      attachments: resolvedPayload.attachments,
      deliveryStatus,
      direction: "OUTBOUND",
      externalCreatedAt: null,
      externalSenderType: isWhatsAppPayload(resolvedPayload) ? "HOST" : null,
      complianceStatus: null,
      errorCode,
      errorMessage,
    });

    await this.threadRepository.updateThreadActivity({
      threadId: resolvedThreadId,
      direction: "OUTBOUND",
      eventAt: Date.now(),
    });

    return {
      statusCode: errorCode ? 502 : 201,
      response: {
        ...message,
        threadId: resolvedThreadId,
        providerResult,
      },
    };
  }

  async sendAutomatedDomitsMessage(payload) {
    if (!payload?.deliveryId || !payload?.automationId || !payload?.bookingId || !payload?.hostId) {
      throw badRequest("Validated automation context is incomplete.");
    }
    const content = String(payload.content || "");
    if (!content.trim()) throw badRequest("Automated message content is required.");

    const booking = await this.loadBookingOr404(payload.bookingId);
    if (!idsEqual(booking.hostid, payload.hostId)) {
      throw forbidden("Automation host does not own this booking.");
    }
    if (!idsEqual(booking.property_id, payload.propertyId)) {
      throw forbidden("Automation property does not match this booking.");
    }
    const existing = await this.messageRepository.findByAutomationDeliveryId(payload.deliveryId);
    if (existing) {
      const existingThread = await this.threadRepository.getThreadById(existing.threadId);
      if (
        !existingThread ||
        !idsEqual(existingThread.bookingId, booking.id) ||
        !idsEqual(existingThread.hostId, booking.hostid) ||
        !idsEqual(existingThread.guestId, booking.guestid) ||
        !idsEqual(existingThread.propertyId, booking.property_id)
      ) {
        throw forbidden("Existing automated message does not match this booking context.");
      }
      return {
        statusCode: 200,
        response: {
          ...existing,
          threadId: existing.threadId,
          reused: true,
          diagnostic: "Existing automated message reconciled.",
        },
      };
    }
    if (String(booking.status || "").trim().toLowerCase() !== "paid") {
      throw forbidden("Booking is not eligible for automated messaging.");
    }

    const resolvedPayload = {
      bookingId: booking.id,
      hostId: booking.hostid,
      guestId: booking.guestid,
      propertyId: booking.property_id,
      platform: "DOMITS",
      content,
      metadata: JSON.stringify({
        isAutomated: true,
        messageType: "booking_paid",
        automationId: payload.automationId,
        automationDeliveryId: payload.deliveryId,
      }),
    };
    const { threadId } = await this.resolveThread(resolvedPayload, booking.hostid, booking.guestid);
    const createdAt = Date.now();
    const stored = await this.messageRepository.createAutomatedMessageIfEligible({
      threadId,
      senderId: booking.hostid,
      recipientId: booking.guestid,
      content,
      automationDeliveryId: payload.deliveryId,
      automationId: payload.automationId,
      bookingId: booking.id,
      propertyId: booking.property_id,
      metadata: resolvedPayload.metadata,
      deliveryStatus: "delivered",
      direction: "OUTBOUND",
      createdAt,
    });
    if (!stored.message) {
      throw forbidden("Automation or booking became ineligible before message creation.");
    }
    const message = stored.message;
    if (!stored.created) {
      if (!idsEqual(message.threadId, threadId)) {
        throw forbidden("Concurrent automated message does not match this booking thread.");
      }
      return {
        statusCode: 200,
        response: {
          ...message,
          threadId: message.threadId,
          reused: true,
          diagnostic: "Concurrent automated message reconciled.",
        },
      };
    }

    const sideEffectFailures = [];
    try {
      await this.threadRepository.updateThreadActivity({ threadId, direction: "OUTBOUND", eventAt: createdAt });
    } catch {
      sideEffectFailures.push("thread activity");
    }
    try {
      await this.realtimePublisher({
        ...message,
        threadId,
        platform: "DOMITS",
        metadata: resolvedPayload.metadata,
      });
    } catch {
      sideEffectFailures.push("realtime publish");
    }

    const diagnostic = sideEffectFailures.length
      ? `Message stored; post-insert side effects incomplete: ${sideEffectFailures.join(", ")}.`
      : null;

    return { statusCode: 201, response: { ...message, threadId, reused: false, diagnostic } };
  }

  async getThreads(authenticatedUser) {
    const threads = await this.threadRepository.getThreadsForUser(authenticatedUser.userId);
    const visible = [];

    for (const thread of threads) {
      try {
        await this.assertThreadAccess(thread, authenticatedUser);
        visible.push(normalizeThread(thread));
      } catch (error) {
        if (error?.statusCode === 403 || error?.statusCode === 404) continue;
        throw error;
      }
    }

    return {
      statusCode: 200,
      response: visible,
    };
  }

  async getMessages(threadId, authenticatedUser) {
    if (!threadId) throw badRequest("threadId is required.");
    const thread = await this.threadRepository.getThreadById(threadId);
    await this.assertThreadAccess(thread, authenticatedUser);
    const messages = await this.messageRepository.getMessagesByThreadId(threadId);
    return {
      statusCode: 200,
      response: messages,
    };
  }

  async getMessagesByUsers(userId, recipientId, propertyId) {
    const thread = await this.threadRepository.findThread(userId, recipientId, propertyId);
    if (!thread) {
      return {
        statusCode: 200,
        response: [],
      };
    }
    const messages = await this.messageRepository.getMessagesByThreadId(thread.id);
    return {
      statusCode: 200,
      response: messages,
    };
  }
}

export default MessageService;
