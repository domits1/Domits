const { badRequest } = require("../util/httpErrors.js");

const ChannexWebhookService = require("./channexWebhookService.js").default;

const SECRET_HEADER = "X-Channex-Webhook-Secret";
const VALID_SECRET = "test-channex-webhook-secret";

const baseChannexWebhookEvent = (overrides = {}) => {
  const { payload: payloadOverrides = {}, ...topLevelOverrides } = overrides;

  return {
    event: "message",
    payload: {
      id: "channex-msg-1",
      message: "Thanks a lot.",
      meta: null,
      sender: "guest",
      property_id: "channex-property-1",
      booking_id: "channex-booking-1",
      message_thread_id: "channex-thread-1",
      live_feed_event_id: "channex-live-1",
      attachments: [],
      have_attachment: false,
      ota_message_id: "ota-msg-1",
      ...payloadOverrides,
    },
    property_id: "channex-property-1",
    user_id: null,
    timestamp: "2021-12-24T00:00:00.0000Z",
    ...topLevelOverrides,
  };
};

const buildLambdaEvent = ({ secret = VALID_SECRET, body, headers = {} } = {}) => ({
  httpMethod: "POST",
  path: "/default/webhooks/channex",
  headers: {
    ...(secret !== null ? { [SECRET_HEADER]: secret } : {}),
    ...headers,
  },
  body: JSON.stringify(body ?? baseChannexWebhookEvent()),
});

const propertyMapping = {
  integrationAccountId: "integration-1",
  domitsPropertyId: "domits-property-1",
  externalPropertyId: "channex-property-1",
};

const integrationAccount = {
  id: "integration-1",
  userId: "host-1",
  channel: "CHANNEX",
};

const normalizedPayload = {
  integrationAccountId: "integration-1",
  platform: "CHANNEX",
  externalThreadId: "channex-thread-1",
  hostId: "host-1",
  guestId: "CHANNEX_GUEST:channex-booking-1",
  propertyId: "domits-property-1",
  status: "OPEN",
  messages: [
    {
      platformMessageId: "channex-msg-1",
      content: "Thanks a lot.",
      direction: "INBOUND",
    },
  ],
};

const existingThread = {
  id: "thread-1",
  integrationAccountId: "integration-1",
  platform: "CHANNEX",
  externalThreadId: "channex-thread-1",
  hostId: "host-1",
  guestId: "CHANNEX_GUEST_THREAD:channex-thread-1",
  bookingId: null,
};

const buildService = ({
  findByExternalPropertyId = jest.fn().mockResolvedValue(propertyMapping),
  getById = jest.fn().mockResolvedValue(integrationAccount),
  ingestExternalThread = jest.fn().mockResolvedValue({
    statusCode: 200,
    response: { ok: true, threadId: "thread-xyz", insertedMessages: 1 },
  }),
  normalizeInboundMessage = jest.fn().mockReturnValue(normalizedPayload),
  findExternalThread = jest.fn().mockResolvedValue(existingThread),
  updateThreadGuestId = jest.fn().mockResolvedValue({ ...existingThread, guestId: "CHANNEX_GUEST:channex-booking-1" }),
} = {}) => {
  const deps = {
    properties: { findByExternalPropertyId },
    accounts: { getById },
    ingestionService: { ingestExternalThread },
    normalizeInboundMessage,
    threads: { findExternalThread, updateThreadGuestId },
  };
  return { service: new ChannexWebhookService(deps), deps };
};

const baseBookingAssignedWebhookEvent = (overrides = {}) => {
  const { payload: payloadOverrides = {}, ...topLevelOverrides } = overrides;

  return {
    event: "message_thread_booking_assigned",
    property_id: "channex-property-1",
    payload: {
      booking_id: "channex-booking-1",
      message_thread_id: "channex-thread-1",
      ...payloadOverrides,
    },
    ...topLevelOverrides,
  };
};

describe("ChannexWebhookService.handleWebhookEvent", () => {
  const originalSecret = process.env.CHANNEX_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.CHANNEX_WEBHOOK_SECRET = VALID_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CHANNEX_WEBHOOK_SECRET;
    } else {
      process.env.CHANNEX_WEBHOOK_SECRET = originalSecret;
    }
  });

  test("valid guest webhook with a valid secret resolves context, normalizes, and ingests exactly once", async () => {
    const { service, deps } = buildService();
    const webhookEvent = baseChannexWebhookEvent();

    const result = await service.handleWebhookEvent(buildLambdaEvent({ body: webhookEvent }));

    expect(deps.properties.findByExternalPropertyId).toHaveBeenCalledWith("channex-property-1");
    expect(deps.accounts.getById).toHaveBeenCalledWith("integration-1");
    expect(deps.normalizeInboundMessage).toHaveBeenCalledWith(webhookEvent, {
      integrationAccountId: "integration-1",
      hostId: "host-1",
      propertyId: "domits-property-1",
      guestId: "CHANNEX_GUEST:channex-booking-1",
    });
    expect(deps.ingestionService.ingestExternalThread).toHaveBeenCalledTimes(1);
    expect(deps.ingestionService.ingestExternalThread).toHaveBeenCalledWith(normalizedPayload);
    expect(result).toEqual({
      statusCode: 200,
      response: { ok: true, threadId: "thread-xyz", insertedMessages: 1 },
    });
  });

  test("missing shared secret returns 403 without touching repositories, normalizer, or ingestion", async () => {
    const { service, deps } = buildService();

    const result = await service.handleWebhookEvent(buildLambdaEvent({ secret: null }));

    expect(result).toMatchObject({ statusCode: 403, response: { error: "FORBIDDEN" } });
    expect(deps.properties.findByExternalPropertyId).not.toHaveBeenCalled();
    expect(deps.accounts.getById).not.toHaveBeenCalled();
    expect(deps.normalizeInboundMessage).not.toHaveBeenCalled();
    expect(deps.ingestionService.ingestExternalThread).not.toHaveBeenCalled();
  });

  test("wrong shared secret returns 403 without touching repositories, normalizer, or ingestion", async () => {
    const { service, deps } = buildService();

    const result = await service.handleWebhookEvent(buildLambdaEvent({ secret: "not-the-right-secret" }));

    expect(result).toMatchObject({ statusCode: 403, response: { error: "FORBIDDEN" } });
    expect(deps.properties.findByExternalPropertyId).not.toHaveBeenCalled();
    expect(deps.accounts.getById).not.toHaveBeenCalled();
    expect(deps.normalizeInboundMessage).not.toHaveBeenCalled();
    expect(deps.ingestionService.ingestExternalThread).not.toHaveBeenCalled();
  });

  test("sender property echo (normalizer returns null) returns 200 and does not ingest", async () => {
    const normalizeInboundMessage = jest.fn().mockReturnValue(null);
    const { service, deps } = buildService({ normalizeInboundMessage });

    const result = await service.handleWebhookEvent(
      buildLambdaEvent({ body: baseChannexWebhookEvent({ payload: { sender: "property" } }) })
    );

    expect(result).toEqual({
      statusCode: 200,
      response: { ok: true, ingested: false, reason: "SKIPPED_NON_GUEST_SENDER" },
    });
    expect(deps.ingestionService.ingestExternalThread).not.toHaveBeenCalled();
  });

  test("unmapped property (findByExternalPropertyId returns null) returns 200 and does not resolve the account or ingest", async () => {
    const findByExternalPropertyId = jest.fn().mockResolvedValue(null);
    const { service, deps } = buildService({ findByExternalPropertyId });

    const result = await service.handleWebhookEvent(buildLambdaEvent());

    expect(result).toEqual({
      statusCode: 200,
      response: { ok: true, ingested: false, reason: "PROPERTY_NOT_MAPPED" },
    });
    expect(deps.accounts.getById).not.toHaveBeenCalled();
    expect(deps.normalizeInboundMessage).not.toHaveBeenCalled();
    expect(deps.ingestionService.ingestExternalThread).not.toHaveBeenCalled();
  });

  test("malformed message payload propagates the normalizer's badRequest as a 400", async () => {
    const normalizeInboundMessage = jest.fn(() => {
      throw badRequest("Channex message payload.id is required.");
    });
    const { service, deps } = buildService({ normalizeInboundMessage });

    await expect(
      service.handleWebhookEvent(buildLambdaEvent({ body: baseChannexWebhookEvent({ payload: { id: null } }) }))
    ).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });

    expect(deps.ingestionService.ingestExternalThread).not.toHaveBeenCalled();
  });

  test("no booking_id passes a null guestId to the normalizer, allowing its thread fallback", async () => {
    const normalizeInboundMessage = jest.fn().mockReturnValue(normalizedPayload);
    const { service, deps } = buildService({ normalizeInboundMessage });

    await service.handleWebhookEvent(
      buildLambdaEvent({ body: baseChannexWebhookEvent({ payload: { booking_id: null } }) })
    );

    expect(deps.normalizeInboundMessage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ guestId: null })
    );
  });

  test("ingestion error/non-2xx result is returned unchanged, not swallowed or converted", async () => {
    const ingestExternalThread = jest.fn().mockResolvedValue({
      statusCode: 500,
      response: { error: "DB_WRITE_FAILED" },
    });
    const { service } = buildService({ ingestExternalThread });

    const result = await service.handleWebhookEvent(buildLambdaEvent());

    expect(result).toEqual({
      statusCode: 500,
      response: { error: "DB_WRITE_FAILED" },
    });
  });

  describe("message_thread_booking_assigned", () => {
    test("valid event finds the thread, updates guestId, and returns 200 without touching messages", async () => {
      const { service, deps } = buildService();

      const result = await service.handleWebhookEvent(
        buildLambdaEvent({ body: baseBookingAssignedWebhookEvent() })
      );

      expect(deps.properties.findByExternalPropertyId).toHaveBeenCalledWith("channex-property-1");
      expect(deps.accounts.getById).toHaveBeenCalledWith("integration-1");
      expect(deps.threads.findExternalThread).toHaveBeenCalledWith({
        integrationAccountId: "integration-1",
        platform: "CHANNEX",
        externalThreadId: "channex-thread-1",
      });
      expect(deps.threads.updateThreadGuestId).toHaveBeenCalledWith("thread-1", "CHANNEX_GUEST:channex-booking-1");
      expect(result).toEqual({ statusCode: 200, response: { ok: true } });
      expect(deps.normalizeInboundMessage).not.toHaveBeenCalled();
      expect(deps.ingestionService.ingestExternalThread).not.toHaveBeenCalled();
    });

    test("thread not found returns 200 THREAD_NOT_FOUND and does not update", async () => {
      const findExternalThread = jest.fn().mockResolvedValue(null);
      const { service, deps } = buildService({ findExternalThread });

      const result = await service.handleWebhookEvent(
        buildLambdaEvent({ body: baseBookingAssignedWebhookEvent() })
      );

      expect(result).toEqual({
        statusCode: 200,
        response: { ok: true, ingested: false, reason: "THREAD_NOT_FOUND" },
      });
      expect(deps.threads.updateThreadGuestId).not.toHaveBeenCalled();
    });

    test("unmapped property returns 200 PROPERTY_NOT_MAPPED without looking up the thread", async () => {
      const findByExternalPropertyId = jest.fn().mockResolvedValue(null);
      const { service, deps } = buildService({ findByExternalPropertyId });

      const result = await service.handleWebhookEvent(
        buildLambdaEvent({ body: baseBookingAssignedWebhookEvent() })
      );

      expect(result).toEqual({
        statusCode: 200,
        response: { ok: true, ingested: false, reason: "PROPERTY_NOT_MAPPED" },
      });
      expect(deps.threads.findExternalThread).not.toHaveBeenCalled();
      expect(deps.threads.updateThreadGuestId).not.toHaveBeenCalled();
    });

    test("missing booking_id rejects with a 400 badRequest", async () => {
      const { service, deps } = buildService();

      await expect(
        service.handleWebhookEvent(
          buildLambdaEvent({ body: baseBookingAssignedWebhookEvent({ payload: { booking_id: null } }) })
        )
      ).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });

      expect(deps.threads.findExternalThread).not.toHaveBeenCalled();
      expect(deps.threads.updateThreadGuestId).not.toHaveBeenCalled();
    });

    test("missing message_thread_id rejects with a 400 badRequest", async () => {
      const { service, deps } = buildService();

      await expect(
        service.handleWebhookEvent(
          buildLambdaEvent({ body: baseBookingAssignedWebhookEvent({ payload: { message_thread_id: null } }) })
        )
      ).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });

      expect(deps.threads.findExternalThread).not.toHaveBeenCalled();
      expect(deps.threads.updateThreadGuestId).not.toHaveBeenCalled();
    });

    test("duplicate delivery (thread already has the target guestId) returns 200 and does not update again", async () => {
      const alreadyAssignedThread = { ...existingThread, guestId: "CHANNEX_GUEST:channex-booking-1" };
      const findExternalThread = jest.fn().mockResolvedValue(alreadyAssignedThread);
      const { service, deps } = buildService({ findExternalThread });

      const result = await service.handleWebhookEvent(
        buildLambdaEvent({ body: baseBookingAssignedWebhookEvent() })
      );

      expect(result).toEqual({ statusCode: 200, response: { ok: true } });
      expect(deps.threads.updateThreadGuestId).not.toHaveBeenCalled();
    });

    test("wrong or missing secret still returns 403 for this event type", async () => {
      const { service, deps } = buildService();

      const missing = await service.handleWebhookEvent(
        buildLambdaEvent({ secret: null, body: baseBookingAssignedWebhookEvent() })
      );
      const wrong = await service.handleWebhookEvent(
        buildLambdaEvent({ secret: "not-the-right-secret", body: baseBookingAssignedWebhookEvent() })
      );

      expect(missing).toMatchObject({ statusCode: 403, response: { error: "FORBIDDEN" } });
      expect(wrong).toMatchObject({ statusCode: 403, response: { error: "FORBIDDEN" } });
      expect(deps.properties.findByExternalPropertyId).not.toHaveBeenCalled();
      expect(deps.threads.findExternalThread).not.toHaveBeenCalled();
      expect(deps.threads.updateThreadGuestId).not.toHaveBeenCalled();
    });
  });
});
