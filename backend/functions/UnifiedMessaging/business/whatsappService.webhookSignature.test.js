const crypto = require("node:crypto");

const WhatsAppService = require("./whatsappService.js").default;

const SIGNATURE_HEADER = "x-hub-signature-256";
const VALID_SECRET = "test-whatsapp-app-secret";

const computeSignature = (secret, rawBody) =>
  `sha256=${crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex")}`;

const buildEvent = ({ rawBody, headers = {} } = {}) => ({
  httpMethod: "POST",
  path: "/default/webhooks/whatsapp",
  headers,
  body: rawBody,
});

const mockProcessing = (service) => {
  jest.spyOn(service, "normalizeWebhookPayload").mockResolvedValue({ inboundThreads: [], statusUpdates: [] });
  jest.spyOn(service, "processInboundThreads").mockResolvedValue([]);
  jest.spyOn(service, "processStatusUpdates").mockResolvedValue([]);
};

const expectProcessingSkipped = (service) => {
  expect(service.normalizeWebhookPayload).not.toHaveBeenCalled();
  expect(service.processInboundThreads).not.toHaveBeenCalled();
  expect(service.processStatusUpdates).not.toHaveBeenCalled();
};

describe("WhatsAppService.handleWebhookEvent webhook signature verification", () => {
  const originalSecret = process.env.WHATSAPP_APP_SECRET;
  const rawBody = JSON.stringify({ entry: [] });

  beforeEach(() => {
    process.env.WHATSAPP_APP_SECRET = VALID_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.WHATSAPP_APP_SECRET;
    } else {
      process.env.WHATSAPP_APP_SECRET = originalSecret;
    }
  });

  test("valid signature returns 200 and runs processing (characterizes current behavior)", async () => {
    const service = new WhatsAppService();
    mockProcessing(service);
    const signature = computeSignature(VALID_SECRET, rawBody);

    const response = await service.handleWebhookEvent(
      buildEvent({ rawBody, headers: { [SIGNATURE_HEADER]: signature } })
    );

    expect(response.statusCode).toBe(200);
    expect(service.normalizeWebhookPayload).toHaveBeenCalled();
    expect(service.processInboundThreads).toHaveBeenCalled();
    expect(service.processStatusUpdates).toHaveBeenCalled();
  });

  test("wrong signature returns 401 and skips processing", async () => {
    const service = new WhatsAppService();
    mockProcessing(service);

    const response = await service.handleWebhookEvent(
      buildEvent({ rawBody, headers: { [SIGNATURE_HEADER]: "sha256=not-the-right-signature" } })
    );

    expect(response.statusCode).toBe(401);
    expect(response.response).toEqual({ error: "Invalid WhatsApp signature" });
    expectProcessingSkipped(service);
  });

  // RED: today the whole signature check is skipped when the header is absent
  // (`if (appSecret && signatureHeader)`), so this currently returns 200.
  test("missing signature header returns 401 and skips processing", async () => {
    const service = new WhatsAppService();
    mockProcessing(service);

    const response = await service.handleWebhookEvent(buildEvent({ rawBody, headers: {} }));

    expect(response.statusCode).toBe(401);
    expect(response.response).toEqual({ error: "Invalid WhatsApp signature" });
    expectProcessingSkipped(service);
  });

  test("same-length wrong signature returns 401 and skips processing", async () => {
    const service = new WhatsAppService();
    mockProcessing(service);
    const validSignature = computeSignature(VALID_SECRET, rawBody);
    const sameLengthWrongSignature =
      validSignature.slice(0, -1) + (validSignature.slice(-1) === "0" ? "1" : "0");
    expect(sameLengthWrongSignature).toHaveLength(validSignature.length);

    const response = await service.handleWebhookEvent(
      buildEvent({ rawBody, headers: { [SIGNATURE_HEADER]: sameLengthWrongSignature } })
    );

    expect(response.statusCode).toBe(401);
    expectProcessingSkipped(service);
  });

  // RED: today an unset secret also skips the whole check and processes the event (200).
  test("secret not configured and no header returns 401 and skips processing", async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const service = new WhatsAppService();
    mockProcessing(service);

    const response = await service.handleWebhookEvent(buildEvent({ rawBody, headers: {} }));

    expect(response.statusCode).toBe(401);
    expectProcessingSkipped(service);
  });

  test("invalid JSON body still returns 400 as today", async () => {
    const service = new WhatsAppService();
    mockProcessing(service);
    const invalidRawBody = "not json";
    const signature = computeSignature(VALID_SECRET, invalidRawBody);

    const response = await service.handleWebhookEvent(
      buildEvent({ rawBody: invalidRawBody, headers: { [SIGNATURE_HEADER]: signature } })
    );

    expect(response.statusCode).toBe(400);
    expect(response.response).toEqual({ error: "Invalid JSON body" });
    expectProcessingSkipped(service);
  });
});
