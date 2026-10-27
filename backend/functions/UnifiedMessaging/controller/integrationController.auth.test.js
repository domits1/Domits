const mockIntegrationService = {
  listIntegrations: jest.fn(),
  getIntegrationLogs: jest.fn(),
  listIntegrationProperties: jest.fn(),
  triggerSync: jest.fn(),
  linkReservation: jest.fn(),
  startWhatsAppConnect: jest.fn(),
  completeWhatsAppConnect: jest.fn(),
  selectWhatsAppNumber: jest.fn(),
  disconnectWhatsApp: jest.fn(),
  checkWhatsAppTokenHealth: jest.fn(),
  refreshWhatsAppToken: jest.fn(),
};

const mockAccounts = {
  getById: jest.fn(),
};

const IntegrationController = require("./integrationController.js").default;

const requestContextFor = ({ sub, claims }) => {
  if (claims !== undefined) {
    return { authorizer: { claims } };
  }
  if (sub) {
    return { authorizer: { claims: { sub, "custom:group": "Host" } } };
  }
  return {};
};

const buildEvent = ({ sub = "host-1", query = {}, body = "{}", path = "/default", claims } = {}) => ({
  body,
  path,
  queryStringParameters: query,
  requestContext: requestContextFor({ sub, claims }),
});

const MISSING_CLAIMS = [
  ["no authorizer context", { sub: null }],
  ["claims without a user id", { claims: { email: "someone@example.com" } }],
];

describe("IntegrationController uses the logged in user", () => {
  let controller;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new IntegrationController({
      integrationService: mockIntegrationService,
      accounts: mockAccounts,
    });
  });

  describe("listIntegrations", () => {
    test.each(MISSING_CLAIMS)("answers 401 with %s", async (_label, eventOptions) => {
      await expect(
        controller.listIntegrations(buildEvent({ ...eventOptions, query: { userId: "host-1" } }))
      ).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(mockIntegrationService.listIntegrations).not.toHaveBeenCalled();
    });

    test("answers 403 for another host's userId", async () => {
      await expect(
        controller.listIntegrations(buildEvent({ sub: "host-1", query: { userId: "host-2" } }))
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockIntegrationService.listIntegrations).not.toHaveBeenCalled();
    });

    test.each([
      ["the same userId", { userId: "host-1" }],
      ["no userId", {}],
    ])("lists the logged in user's integrations with %s", async (_label, query) => {
      mockIntegrationService.listIntegrations.mockResolvedValue({ statusCode: 200, response: [] });

      await controller.listIntegrations(buildEvent({ sub: "host-1", query }));

      expect(mockIntegrationService.listIntegrations).toHaveBeenCalledWith("host-1");
    });
  });

  describe.each([
    "startWhatsAppConnect",
    "completeWhatsAppConnect",
    "selectWhatsAppNumber",
    "disconnectWhatsApp",
    "checkWhatsAppTokenHealth",
    "refreshWhatsAppToken",
  ])("%s", (method) => {
    test.each(MISSING_CLAIMS)("answers 401 with %s", async (_label, eventOptions) => {
      await expect(
        controller[method](buildEvent({ ...eventOptions, body: JSON.stringify({ userId: "host-1" }) }))
      ).rejects.toMatchObject({ statusCode: 401 });
      expect(mockIntegrationService[method]).not.toHaveBeenCalled();
    });

    test("answers 403 for another host's userId", async () => {
      await expect(
        controller[method](buildEvent({ sub: "host-1", body: JSON.stringify({ userId: "host-2" }) }))
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockIntegrationService[method]).not.toHaveBeenCalled();
    });

    test("always passes the logged in user's id to the service", async () => {
      mockIntegrationService[method].mockResolvedValue({ statusCode: 200, response: {} });

      await controller[method](buildEvent({ sub: "host-1", body: JSON.stringify({ code: "abc" }) }));

      expect(mockIntegrationService[method]).toHaveBeenCalledWith({ code: "abc", userId: "host-1" });
    });
  });
});
