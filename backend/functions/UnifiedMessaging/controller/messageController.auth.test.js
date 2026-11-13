const mockMessageService = {
  sendMessage: jest.fn(),
  getThreads: jest.fn(),
  getMessages: jest.fn(),
  markThreadRead: jest.fn(),
  markThreadUnread: jest.fn(),
  closeThread: jest.fn(),
  retryMessage: jest.fn(),
};

jest.mock("../business/messageService.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockMessageService),
}));

const MessageController = require("./messageController.js").default;

const buildEvent = ({
  sub = "guest-1",
  group = "guest",
  query = {},
  body = "{}",
  jwt = false,
  claimsPatch = {},
  path = "/default",
} = {}) => ({
  body,
  path,
  queryStringParameters: query,
  requestContext: sub
    ? {
        authorizer: {
          ...(jwt
            ? {
                jwt: {
                  claims: {
                    sub,
                    "custom:role": group,
                    ...claimsPatch,
                  },
                },
              }
            : {
                claims: {
                  sub,
                  "custom:role": group,
                  ...claimsPatch,
                },
              }),
        },
      }
    : {},
});

describe("MessageController authenticated user handling", () => {
  let controller;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MessageController();
  });

  test("sendMessage forwards parsed body with the authenticated user", async () => {
    mockMessageService.sendMessage.mockResolvedValue({ statusCode: 201, response: { ok: true } });
    const event = buildEvent({ body: JSON.stringify({ recipientId: "host-1", content: "Hello" }) });

    await controller.sendMessage(event);

    expect(mockMessageService.sendMessage).toHaveBeenCalledWith(
      { recipientId: "host-1", content: "Hello" },
      expect.objectContaining({
        userId: "guest-1",
        isGuest: true,
        isHost: false,
      })
    );
  });

  test("sendMessage with retryMessageId retries that message and does not send a new one", async () => {
    mockMessageService.retryMessage.mockResolvedValue({ statusCode: 200, response: { id: "message-9" } });
    const event = buildEvent({ sub: "host-1", group: "host", body: JSON.stringify({ retryMessageId: "message-9" }) });

    const result = await controller.sendMessage(event);

    expect(mockMessageService.retryMessage).toHaveBeenCalledWith(
      "message-9",
      expect.objectContaining({ userId: "host-1", isHost: true })
    );
    expect(mockMessageService.sendMessage).not.toHaveBeenCalled();
    expect(result).toEqual({ statusCode: 200, response: { id: "message-9" } });
  });

  test("sendMessage without retryMessageId sends a new message and does not retry", async () => {
    mockMessageService.sendMessage.mockResolvedValue({ statusCode: 201, response: { ok: true } });

    await controller.sendMessage(buildEvent({ body: JSON.stringify({ recipientId: "host-1", content: "Hello" }) }));

    expect(mockMessageService.sendMessage).toHaveBeenCalled();
    expect(mockMessageService.retryMessage).not.toHaveBeenCalled();
  });

  test("sendMessage with retryMessageId requires trusted authorizer claims", async () => {
    await expect(
      controller.sendMessage(buildEvent({ sub: null, body: JSON.stringify({ retryMessageId: "message-9" }) }))
    ).rejects.toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" });
    expect(mockMessageService.retryMessage).not.toHaveBeenCalled();
  });

  test("getThreads rejects query userId spoofing", async () => {
    await expect(controller.getThreads(buildEvent({ query: { userId: "other-user" } }))).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
    expect(mockMessageService.getThreads).not.toHaveBeenCalled();
  });

  test("requires trusted authorizer claims", async () => {
    await expect(controller.getMessages(buildEvent({ sub: null, query: { threadId: "thread-1" } }))).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  });

  test("supports HTTP API jwt authorizer claims", async () => {
    mockMessageService.getMessages.mockResolvedValue({ statusCode: 200, response: [] });

    await controller.getMessages(buildEvent({ jwt: true, query: { threadId: "thread-1" } }));

    expect(mockMessageService.getMessages).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({
        userId: "guest-1",
        isGuest: true,
      })
    );
  });

  test("does not accept username without sub as the user identity", async () => {
    await expect(
      controller.getThreads({
        requestContext: {
          authorizer: {
            claims: {
              username: "guest-1",
              "custom:role": "guest",
            },
          },
        },
        queryStringParameters: {},
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
  });

  test("invalid JSON returns a bad request error", async () => {
    await expect(controller.sendMessage(buildEvent({ body: "not-json" }))).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
  });

  test.each([
    ["markThreadRead", "read"],
    ["markThreadUnread", "unread"],
    ["closeThread", "close"],
  ])("%s extracts threadId from the path and forwards the authenticated user", async (methodName, pathSuffix) => {
    mockMessageService[methodName].mockResolvedValue({
      statusCode: 200,
      response: { threadId: "thread-1", updated: 1 },
    });

    await controller[methodName](buildEvent({ path: `/default/threads/thread-1/${pathSuffix}` }));

    expect(mockMessageService[methodName]).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({ userId: "guest-1", isGuest: true })
    );
  });
});
