const mockSend = jest.fn();

jest.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: jest.fn(() => ({ send: (...args) => mockSend(...args) })),
  InvokeCommand: jest.fn((input) => ({ input })),
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
});
