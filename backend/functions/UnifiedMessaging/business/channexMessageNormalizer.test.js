const { normalizeChannexInboundMessage } = require("./channexMessageNormalizer.js");
const { baseWebhookEvent } = require("./channexWebhookFixtures.js");

const baseContext = (overrides = {}) => ({
  integrationAccountId: "integration-1",
  hostId: "host-1",
  propertyId: "domits-property-1",
  guestId: "CHANNEX_GUEST:channex-booking-1",
  ...overrides,
});

describe("normalizeChannexInboundMessage", () => {
  test("produces an ingestExternalThread-compatible payload for a valid guest message", () => {
    const result = normalizeChannexInboundMessage(baseWebhookEvent(), baseContext());

    expect(result).toMatchObject({
      integrationAccountId: "integration-1",
      platform: "CHANNEX",
      externalThreadId: "channex-thread-1",
      hostId: "host-1",
      guestId: "CHANNEX_GUEST:channex-booking-1",
      propertyId: "domits-property-1",
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      platformMessageId: "channex-msg-1",
      content: "Thanks a lot.",
      direction: "INBOUND",
      externalSenderType: "GUEST",
      senderId: "CHANNEX_GUEST:channex-booking-1",
      recipientId: "host-1",
    });
  });

  test("returns null for an outbound echo where sender is property", () => {
    const webhookEvent = baseWebhookEvent({ payload: { sender: "property" } });

    const result = normalizeChannexInboundMessage(webhookEvent, baseContext());

    expect(result).toBeNull();
  });

  test("uses a synthetic thread-scoped guestId when no booking guestId has been resolved yet", () => {
    const context = baseContext({ guestId: null });

    const result = normalizeChannexInboundMessage(baseWebhookEvent(), context);

    expect(result.guestId).toBe("CHANNEX_GUEST_THREAD:channex-thread-1");
    expect(result.messages[0].senderId).toBe("CHANNEX_GUEST_THREAD:channex-thread-1");
  });

  test("preserves raw attachments and have_attachment verbatim in metadata without parsing them", () => {
    const rawAttachments = [{ id: "attachment-1", type: "attachment" }];
    const webhookEvent = baseWebhookEvent({
      payload: { attachments: rawAttachments, have_attachment: true },
    });

    const result = normalizeChannexInboundMessage(webhookEvent, baseContext());

    expect(result.messages[0].metadata).toMatchObject({
      channexAttachments: rawAttachments,
      channexHaveAttachment: true,
    });
    expect(result.messages[0].attachments).toBeNull();
  });

  test("rejects a message payload with no id", () => {
    const webhookEvent = baseWebhookEvent({ payload: { id: null } });

    expect(() => normalizeChannexInboundMessage(webhookEvent, baseContext())).toThrow(
      /payload\.id/
    );
  });

  test("rejects a message payload with no message_thread_id", () => {
    const webhookEvent = baseWebhookEvent({ payload: { message_thread_id: null } });

    expect(() => normalizeChannexInboundMessage(webhookEvent, baseContext())).toThrow(
      /message_thread_id/
    );
  });

  test("normalizes the Channex ISO webhook timestamp to milliseconds", () => {
    const webhookEvent = baseWebhookEvent({ timestamp: "2021-12-24T00:00:00.0000Z" });

    const result = normalizeChannexInboundMessage(webhookEvent, baseContext());

    expect(result.messages[0].externalCreatedAt).toBe(1640304000000);
  });
});
