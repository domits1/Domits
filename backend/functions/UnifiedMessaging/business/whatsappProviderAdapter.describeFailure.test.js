jest.mock("../.shared/integrations/repositories/integrationAccountRepository.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ getById: jest.fn() })),
}));

jest.mock("./whatsappCredentialStore.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ readSecretOrNull: jest.fn() })),
}));

const WhatsAppProviderAdapter = require("./whatsappProviderAdapter.js").default;

describe("WhatsAppProviderAdapter.describeFailure", () => {
  test("preserves the existing WhatsApp failure metadata shape exactly for a media send", () => {
    const adapter = new WhatsAppProviderAdapter();
    const payload = {
      integrationAccountId: "integration-1",
      attachments: [{ url: "https://example.com/a.png", type: "image" }],
      content: "hello",
    };
    const error = new Error("boom");
    error.details = { raw: "detail" };

    const result = adapter.describeFailure(payload, "31612345678", error);

    expect(result).toEqual({
      accepted: false,
      mode: "live",
      channel: "WHATSAPP",
      integrationAccountId: "integration-1",
      externalAccountId: null,
      recipientWhatsAppId: "31612345678",
      messageType: "media",
      text: "hello",
      error: "boom",
      details: { raw: "detail" },
    });
  });

  test("preserves the existing WhatsApp failure metadata shape exactly for a text send with no attachments", () => {
    const adapter = new WhatsAppProviderAdapter();
    const payload = { integrationAccountId: null, content: "hi" };
    const error = new Error("send failed");

    const result = adapter.describeFailure(payload, "31600000000", error);

    expect(result).toEqual({
      accepted: false,
      mode: "live",
      channel: "WHATSAPP",
      integrationAccountId: null,
      externalAccountId: null,
      recipientWhatsAppId: "31600000000",
      messageType: "text",
      text: "hi",
      error: "send failed",
      details: null,
    });
  });
});
