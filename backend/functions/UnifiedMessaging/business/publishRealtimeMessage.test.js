const mockSend = jest.fn();

jest.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: jest.fn(() => ({ send: (...args) => mockSend(...args) })),
  InvokeCommand: jest.fn((input) => ({ input })),
}));

jest.mock("../util/attachmentUrlSigner.js", () => ({
  signUrlList: jest.fn(async (urls) => urls.map((url) => `${url}?signed`)),
  signAttachments: jest.fn(async (attachments) =>
    Array.isArray(attachments) ? attachments.map((item) => ({ ...item, url: `${item.url}?signed` })) : attachments
  ),
}));

import publishRealtimeMessage from "./publishRealtimeMessage.js";

const invokedBody = () => JSON.parse(JSON.parse(Buffer.from(mockSend.mock.calls[0][0].input.Payload).toString()).body);

describe("publishRealtimeMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});
  });

  test("includes the stored message id in the body sent to the websocket Lambda", async () => {
    await publishRealtimeMessage({ id: "stored-1", senderId: "guest-1", recipientId: "host-1", text: "Hello" });

    expect(invokedBody()).toEqual(expect.objectContaining({ id: "stored-1", senderId: "guest-1", text: "Hello" }));
  });

  test("leaves the id out of the body when the caller has none", async () => {
    await publishRealtimeMessage({ senderId: "guest-1", recipientId: "host-1", text: "Hello" });

    expect(invokedBody()).not.toHaveProperty("id");
  });

  test("sends signed attachment URLs in fileUrls and attachments", async () => {
    await publishRealtimeMessage({
      senderId: "guest-1",
      recipientId: "host-1",
      fileUrls: ["https://bucket.example/images/a.png"],
      attachments: [{ url: "https://bucket.example/images/a.png", type: "image" }],
    });

    expect(invokedBody()).toEqual(
      expect.objectContaining({
        fileUrls: ["https://bucket.example/images/a.png?signed"],
        attachments: [{ url: "https://bucket.example/images/a.png?signed", type: "image" }],
      })
    );
  });

  test("keeps an empty fileUrls list and no attachments when the message has none", async () => {
    await publishRealtimeMessage({ senderId: "guest-1", recipientId: "host-1", text: "Hello" });

    expect(invokedBody()).toEqual(expect.objectContaining({ fileUrls: [], attachments: null }));
  });
});
