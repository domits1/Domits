const mockMessageService = {
  sendMessage: jest.fn(),
  getThreads: jest.fn(),
  getMessages: jest.fn(),
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
} = {}) => ({
  body,
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
});
