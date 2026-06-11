const mockMessageControllerMethods = {
  sendMessage: jest.fn(),
  getThreads: jest.fn(),
  getMessages: jest.fn(),
};
const mockIntegrationControllerMethods = {
  startWhatsAppConnect: jest.fn(),
  completeWhatsAppConnect: jest.fn(),
  selectWhatsAppNumber: jest.fn(),
  disconnectWhatsApp: jest.fn(),
  checkWhatsAppTokenHealth: jest.fn(),
  refreshWhatsAppToken: jest.fn(),
  listIntegrations: jest.fn(),
};
const mockIngestionControllerMethods = {
  ingestMessages: jest.fn(),
};
const mockWhatsAppWebhookControllerMethods = {
  verifyWebhook: jest.fn(),
  handleWebhookEvent: jest.fn(),
};

jest.mock("./controller/messageController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockMessageControllerMethods),
}));

jest.mock("./controller/integrationController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockIntegrationControllerMethods),
}));

jest.mock("./controller/ingestionController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockIngestionControllerMethods),
}));

jest.mock("./controller/whatsappWebhookController.js", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockWhatsAppWebhookControllerMethods),
}));

const { handler } = require("./index.js");

const allControllerMethods = [
  ...Object.values(mockMessageControllerMethods),
  ...Object.values(mockIntegrationControllerMethods),
  ...Object.values(mockIngestionControllerMethods),
  ...Object.values(mockWhatsAppWebhookControllerMethods),
];

const buildEvent = ({ method = "GET", path, query = {}, body = null, headers = {} }) => ({
  httpMethod: method,
  path,
  queryStringParameters: query,
  headers,
  body,
});

const buildControllerResponse = (route) => ({
  statusCode: 200,
  response: { route },
});

const parseBody = (response) => JSON.parse(response.body);

describe("UnifiedMessaging retained route contracts", () => {
  beforeEach(() => {
    allControllerMethods.forEach((method) => method.mockReset());
  });

  test.each([
    ["POST", "/default/send", mockMessageControllerMethods.sendMessage, "send"],
    ["GET", "/default/threads", mockMessageControllerMethods.getThreads, "threads"],
    ["GET", "/default/messages", mockMessageControllerMethods.getMessages, "messages"],
    [
      "POST",
      "/default/integrations/whatsapp/ingest/messages",
      mockIngestionControllerMethods.ingestMessages,
      "ingest",
    ],
    ["GET", "/default/webhooks/whatsapp", mockWhatsAppWebhookControllerMethods.verifyWebhook, "webhook-verify"],
    [
      "POST",
      "/default/webhooks/whatsapp",
      mockWhatsAppWebhookControllerMethods.handleWebhookEvent,
      "webhook-event",
    ],
  ])("%s %s keeps its controller contract", async (method, path, controllerMethod, route) => {
    controllerMethod.mockResolvedValue(buildControllerResponse(route));
    const event = buildEvent({ method, path, body: method === "POST" ? "{}" : null });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(parseBody(response)).toEqual({ route });
    expect(controllerMethod).toHaveBeenCalledWith(event);
  });

  test.each([
    ["/default/integrations/whatsapp/connect/start", mockIntegrationControllerMethods.startWhatsAppConnect],
    ["/default/integrations/whatsapp/connect/complete", mockIntegrationControllerMethods.completeWhatsAppConnect],
    [
      "/default/integrations/whatsapp/connect/select-number",
      mockIntegrationControllerMethods.selectWhatsAppNumber,
    ],
    ["/default/integrations/whatsapp/disconnect", mockIntegrationControllerMethods.disconnectWhatsApp],
    ["/default/integrations/whatsapp/token/health", mockIntegrationControllerMethods.checkWhatsAppTokenHealth],
    ["/default/integrations/whatsapp/token/refresh", mockIntegrationControllerMethods.refreshWhatsAppToken],
  ])("POST %s keeps its WhatsApp connection contract", async (path, controllerMethod) => {
    controllerMethod.mockResolvedValue(buildControllerResponse(path));
    const event = buildEvent({ method: "POST", path, body: "{\"userId\":\"user-1\"}" });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual({ route: path });
    expect(controllerMethod).toHaveBeenCalledWith(event);
  });

  test("GET /integrations remains routed to the generic integration listing", async () => {
    mockIntegrationControllerMethods.listIntegrations.mockResolvedValue({
      statusCode: 200,
      response: [{ id: "integration-1", channel: "WHATSAPP" }],
    });
    const event = buildEvent({
      path: "/default/integrations",
      query: { userId: "user-1" },
    });

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual([{ id: "integration-1", channel: "WHATSAPP" }]);
    expect(mockIntegrationControllerMethods.listIntegrations).toHaveBeenCalledWith(event);
  });

  test("OPTIONS keeps the existing CORS response without invoking a controller", async () => {
    const response = await handler(buildEvent({ method: "OPTIONS", path: "/default/messages" }));

    expect(response).toEqual({
      statusCode: 200,
      headers: expect.objectContaining({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
      }),
      body: "",
    });
    allControllerMethods.forEach((method) => expect(method).not.toHaveBeenCalled());
  });
});
