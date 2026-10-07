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

const buildLambdaEvent = ({ secret = VALID_SECRET, body, rawBody, headers = {} } = {}) => ({
  httpMethod: "POST",
  path: "/default/webhooks/channex",
  headers: {
    ...(secret !== null ? { [SECRET_HEADER]: secret } : {}),
    ...headers,
  },
  body: rawBody !== undefined ? rawBody : JSON.stringify(body ?? baseChannexWebhookEvent()),
});

const propertyMapping = {
  integrationAccountId: "integration-1",
  domitsPropertyId: "domits-property-1",
  externalPropertyId: "channex-property-1",
  status: "ACTIVE",
  updatedAt: 1000,
};

const integrationAccount = {
  id: "integration-1",
  userId: "host-1",
  channel: "CHANNEX",
  status: "CONNECTED",
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

const assertNoSideEffects = (deps, { properties = true, accounts = true, normalize = true, ingest = true } = {}) => {
  if (properties) expect(deps.properties.findByExternalPropertyId).not.toHaveBeenCalled();
  if (accounts) expect(deps.accounts.getById).not.toHaveBeenCalled();
  if (normalize) expect(deps.normalizeInboundMessage).not.toHaveBeenCalled();
  if (ingest) expect(deps.ingestionService.ingestExternalThread).not.toHaveBeenCalled();
};

const buildService = ({
  findByExternalPropertyId = jest.fn().mockResolvedValue([propertyMapping]),
  getById = jest.fn().mockResolvedValue(integrationAccount),
  ingestExternalThread = jest.fn().mockResolvedValue({
    statusCode: 200,
    response: { ok: true, threadId: "thread-xyz", insertedMessages: 1 },
  }),
  normalizeInboundMessage = jest.fn().mockReturnValue(normalizedPayload),
} = {}) => {
  const deps = {
    properties: { findByExternalPropertyId },
    accounts: { getById },
    ingestionService: { ingestExternalThread },
    normalizeInboundMessage,
  };
  return { service: new ChannexWebhookService(deps), deps };
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

  test.each([
    [
      "missing shared secret returns 403 without touching repositories, normalizer, or ingestion",
      { secret: null },
      { statusCode: 403, response: { error: "FORBIDDEN" } },
      false,
    ],
    [
      "wrong shared secret returns 403 without touching repositories, normalizer, or ingestion",
      { secret: "not-the-right-secret" },
      { statusCode: 403, response: { error: "FORBIDDEN" } },
      false,
    ],
    [
      "wrong secret with the same length as the valid secret still returns 403 (exercises timingSafeEqual itself, not just the length guard)",
      { secret: "x".repeat(VALID_SECRET.length) },
      { statusCode: 403, response: { error: "FORBIDDEN" } },
      false,
    ],
    [
      "a body that is not valid JSON returns 400, matching the WhatsApp webhook's invalid-JSON handling",
      { rawBody: "{not valid json" },
      { statusCode: 400, response: { error: "Invalid JSON body" } },
      true,
    ],
    [
      'a webhook event type other than "message" is ignored early, with no property/account lookup or ingestion',
      { body: baseChannexWebhookEvent({ event: "ota_ping" }) },
      { statusCode: 200, response: { ok: true, ingested: false, reason: "EVENT_IGNORED" } },
      true,
    ],
  ])("%s", async (_name, eventOverrides, expected, exact) => {
    const { service, deps } = buildService();

    const result = await service.handleWebhookEvent(buildLambdaEvent(eventOverrides));

    if (exact) {
      expect(result).toEqual(expected);
    } else {
      expect(result).toMatchObject(expected);
    }
    assertNoSideEffects(deps);
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

  test("no ACTIVE mapping (findByExternalPropertyId returns an empty list) returns 200, logs a warning with the property id, and does not resolve the account or ingest", async () => {
    const findByExternalPropertyId = jest.fn().mockResolvedValue([]);
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { service, deps } = buildService({ findByExternalPropertyId });

    const result = await service.handleWebhookEvent(buildLambdaEvent());

    expect(result).toEqual({
      statusCode: 200,
      response: { ok: true, ingested: false, reason: "PROPERTY_NOT_MAPPED" },
    });
    assertNoSideEffects(deps, { properties: false });
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0].join(" ")).toContain("channex-property-1");

    warnSpy.mockRestore();
  });

  test("several ACTIVE mappings: the newest (first in the ordered list) is used, and a warning is logged with the property id and count", async () => {
    const newerMapping = { ...propertyMapping, integrationAccountId: "integration-1", updatedAt: 2000 };
    const olderMapping = { ...propertyMapping, integrationAccountId: "integration-2", updatedAt: 1000 };
    const findByExternalPropertyId = jest.fn().mockResolvedValue([newerMapping, olderMapping]);
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const { service, deps } = buildService({ findByExternalPropertyId });
    await service.handleWebhookEvent(buildLambdaEvent());

    expect(deps.accounts.getById).toHaveBeenCalledWith("integration-1");
    expect(warnSpy).toHaveBeenCalled();
    const loggedText = warnSpy.mock.calls[0].join(" ");
    expect(loggedText).toContain("channex-property-1");
    expect(loggedText).toContain("2");

    warnSpy.mockRestore();
  });

  test("a single ACTIVE mapping does not log a warning", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { service } = buildService();

    await service.handleWebhookEvent(buildLambdaEvent());

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("newest mapping's account has the wrong channel: PROPERTY_NOT_MAPPED, no ingestion", async () => {
    const getById = jest.fn().mockResolvedValue({
      id: "integration-1",
      userId: "host-1",
      channel: "WHATSAPP",
      status: "CONNECTED",
    });
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { service, deps } = buildService({ getById });

    const result = await service.handleWebhookEvent(buildLambdaEvent());

    expect(result).toEqual({
      statusCode: 200,
      response: { ok: true, ingested: false, reason: "PROPERTY_NOT_MAPPED" },
    });
    assertNoSideEffects(deps, { properties: false, accounts: false });
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0].join(" ")).toContain("channex-property-1");

    warnSpy.mockRestore();
  });

  test("newest mapping's account is DISCONNECTED: PROPERTY_NOT_MAPPED, no ingestion", async () => {
    const getById = jest.fn().mockResolvedValue({
      id: "integration-1",
      userId: "host-1",
      channel: "CHANNEX",
      status: "DISCONNECTED",
    });
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { service, deps } = buildService({ getById });

    const result = await service.handleWebhookEvent(buildLambdaEvent());

    expect(result).toEqual({
      statusCode: 200,
      response: { ok: true, ingested: false, reason: "PROPERTY_NOT_MAPPED" },
    });
    assertNoSideEffects(deps, { properties: false, accounts: false });
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0].join(" ")).toContain("channex-property-1");

    warnSpy.mockRestore();
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
});
