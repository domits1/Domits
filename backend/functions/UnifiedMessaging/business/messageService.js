import MessageRepository from "../data/messageRepository.js";
import ThreadRepository from "../data/threadRepository.js";

class MessageService {
  constructor() {
    this.messageRepository = new MessageRepository();
    this.threadRepository = new ThreadRepository();
  }

  /**
   * Determine correct hostId/guestId.
   * Preferred sources:
   *  - payload.hostId / payload.guestId (best)
   *  - payload.metadata.hostId / guestId
   *  - payload.metadata.senderGroup ("Host"|"Guest") as heuristic
   * Fallback:
   *  - If senderGroup missing: assume recipient is host when platform is DOMITS (guest initiates from listing)
   */
  normalizeParticipants(payload) {
    const senderId = payload?.senderId;
    const recipientId = payload?.recipientId;

    const meta = payload?.metadata && typeof payload.metadata === "string"
      ? (() => {
          try { return JSON.parse(payload.metadata); } catch { return {}; }
        })()
      : (payload?.metadata || {});

    const explicitHostId = payload?.hostId || meta?.hostId || null;
    const explicitGuestId = payload?.guestId || meta?.guestId || null;

    if (explicitHostId && explicitGuestId) {
      return { hostId: explicitHostId, guestId: explicitGuestId };
    }

    const senderGroup = meta?.senderGroup || meta?.role || null; // "Host" | "Guest" (frontend can send)
    if (senderGroup === "Host") {
      return { hostId: senderId, guestId: recipientId };
    }
    if (senderGroup === "Guest") {
      return { hostId: recipientId, guestId: senderId };
    }

    // Fallback heuristic:
    // In your product, the guest usually initiates from listing -> recipient is host.
    // This avoids creating reversed threads when the first message comes from a guest.
    return { hostId: recipientId, guestId: senderId };
  }

  async sendMessage(payload) {
    if (!payload?.senderId || !payload?.recipientId) {
      return { statusCode: 400, response: { error: "senderId and recipientId are required" } };
    }

    if (payload.senderId === payload.recipientId) {
      return { statusCode: 400, response: { error: "senderId and recipientId cannot be the same" } };
    }

    // ✅ Strongly recommended: propertyId should be provided for DOMITS listing context
    // If you want to hard-enforce it, uncomment the block below.
    /*
    if ((payload.platform || "DOMITS") === "DOMITS" && !payload.propertyId) {
      return { statusCode: 400, response: { error: "propertyId is required for DOMITS messages" } };
    }
    */

    const { hostId, guestId } = this.normalizeParticipants(payload);

    let threadId = payload.threadId;

    if (!threadId) {
      // ✅ Find exact thread for (host, guest, propertyId) with auto-heal if swapped exists
      let thread = await this.threadRepository.findThreadNormalized(hostId, guestId, payload.propertyId);

      if (!thread) {
        thread = await this.threadRepository.createThread({
          hostId,
          guestId,
          propertyId: payload.propertyId ?? null,
          platform: payload.platform || "DOMITS",
          externalThreadId: payload.externalThreadId,
        });
      }

      threadId = thread.id;
    }

    const message = await this.messageRepository.createMessage({
      threadId,
      senderId: payload.senderId,
      recipientId: payload.recipientId,
      content: payload.content,
      platformMessageId: payload.platformMessageId,
      metadata: payload.metadata,
      attachments: payload.attachments,
      deliveryStatus: (payload.platform || "DOMITS") === "DOMITS" ? "delivered" : "pending",
    });

    await this.threadRepository.updateLastMessageAt(threadId, Date.now());

    return {
      statusCode: 201,
      response: message,
    };
  }

  async getThreads(userId) {
    const threads = await this.threadRepository.getThreadsForUser(userId);
    return { statusCode: 200, response: threads };
  }

  async getMessages(threadId) {
    const messages = await this.messageRepository.getMessagesByThreadId(threadId);
    return { statusCode: 200, response: messages };
  }
}

export default MessageService;