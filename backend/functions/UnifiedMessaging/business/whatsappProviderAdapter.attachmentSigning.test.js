jest.mock("../.shared/integrations/repositories/integrationAccountRepository.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ getById: jest.fn() })),
}));

jest.mock("./whatsappCredentialStore.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ readSecretOrNull: jest.fn() })),
}));

const WhatsAppProviderAdapter = require("./whatsappProviderAdapter.js").default;

const RAW_URL = "https://general-messaging-production-attachments.s3.amazonaws.com/images/abc-123.png";
const SIGNED_URL = `${RAW_URL}?X-Amz-Signature=test`;

const attachmentSigner = {
  signAttachments: jest.fn(async (attachments) =>
    Array.isArray(attachments)
      ? attachments.map((item) => ({ ...item, url: item.url === RAW_URL ? SIGNED_URL : item.url }))
      : attachments
  ),
};

const buildAdapter = () => {
  const adapter = new WhatsAppProviderAdapter({ attachmentSigner });
  adapter.integrationAccounts.getById.mockResolvedValue({
    id: "integration-1",
    externalAccountId: "phone-1",
    credentialsRef: "secret-1",
  });
  adapter.credentialStore.readSecretOrNull.mockResolvedValue({ accessToken: "token-1" });
  return adapter;
};

const sentBody = () => JSON.parse(global.fetch.mock.calls[0][1].body);

describe("WhatsAppProviderAdapter signs attachment links for Meta", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ messages: [{ id: "wamid-1" }] }),
    });
  });

  test("sends a signed link, because Meta downloads the file without credentials", async () => {
    await buildAdapter().sendMessage({
      integrationAccountId: "integration-1",
      recipientId: "31612345678",
      content: "photo",
      attachments: [{ url: RAW_URL, type: "image" }],
    });

    expect(sentBody()).toEqual(expect.objectContaining({ type: "image", image: expect.objectContaining({ link: SIGNED_URL }) }));
  });

  test("sends a link from another host as it is", async () => {
    await buildAdapter().sendMessage({
      integrationAccountId: "integration-1",
      recipientId: "31612345678",
      content: "photo",
      attachments: [{ url: "https://example.com/a.png", type: "image" }],
    });

    expect(sentBody().image.link).toBe("https://example.com/a.png");
  });

  test("sends a text message when there are no attachments", async () => {
    await buildAdapter().sendMessage({
      integrationAccountId: "integration-1",
      recipientId: "31612345678",
      content: "hello",
      attachments: null,
    });

    expect(sentBody()).toEqual(expect.objectContaining({ type: "text" }));
  });
});
