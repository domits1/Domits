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

    test.each([null, ""])("does not let a body userId of %p replace the logged in user", async (userId) => {
      mockIntegrationService[method].mockResolvedValue({ statusCode: 200, response: {} });

      await controller[method](buildEvent({ sub: "host-1", body: JSON.stringify({ userId }) }));

      expect(mockIntegrationService[method]).toHaveBeenCalledWith({ userId: "host-1" });
    });
  });

  describe.each([
    {
      method: "getIntegrationLogs",
      serviceMethod: "getIntegrationLogs",
      path: "/default/integrations/integration-1/logs",
      body: "{}",
      expectedArgs: ["integration-1", 50],
    },
    {
      method: "listIntegrationProperties",
      serviceMethod: "listIntegrationProperties",
      path: "/default/integrations/integration-1/properties",
      body: "{}",
      expectedArgs: ["integration-1"],
    },
    {
      method: "triggerMessagesSync",
      serviceMethod: "triggerSync",
      path: "/default/integrations/integration-1/sync/messages",
      body: "{}",
      expectedArgs: ["integration-1", "MESSAGES", {}],
    },
    {
      method: "triggerReservationsSync",
      serviceMethod: "triggerSync",
      path: "/default/integrations/integration-1/sync/reservations",
      body: "{}",
      expectedArgs: ["integration-1", "RESERVATIONS", {}],
    },
    {
      method: "linkReservation",
      serviceMethod: "linkReservation",
      path: "/default/integrations/integration-1/reservations/link",
      body: JSON.stringify({ channel: "CHANNEX", externalReservationId: "ext-1" }),
      expectedArgs: ["integration-1", { channel: "CHANNEX", externalReservationId: "ext-1" }],
    },
  ])("$method", ({ method, serviceMethod, path, body, expectedArgs }) => {
    test.each(MISSING_CLAIMS)("answers 401 with %s before loading the integration", async (_label, eventOptions) => {
      await expect(controller[method](buildEvent({ ...eventOptions, path, body }))).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(mockAccounts.getById).not.toHaveBeenCalled();
      expect(mockIntegrationService[serviceMethod]).not.toHaveBeenCalled();
    });

    test("answers 404 when the integration does not exist", async () => {
      mockAccounts.getById.mockResolvedValue(null);

      await expect(controller[method](buildEvent({ sub: "host-1", path, body }))).rejects.toMatchObject({
        statusCode: 404,
        message: "Integration not found.",
      });
      expect(mockAccounts.getById).toHaveBeenCalledWith("integration-1");
      expect(mockIntegrationService[serviceMethod]).not.toHaveBeenCalled();
    });

    test("answers the same 404 for another host's integration", async () => {
      mockAccounts.getById.mockResolvedValue({ id: "integration-1", userId: "host-2" });

      await expect(controller[method](buildEvent({ sub: "host-1", path, body }))).rejects.toMatchObject({
        statusCode: 404,
        message: "Integration not found.",
      });
      expect(mockIntegrationService[serviceMethod]).not.toHaveBeenCalled();
    });

    test("does not act when the integration cannot be loaded", async () => {
      const failure = new Error("connection reset");
      mockAccounts.getById.mockRejectedValue(failure);

      await expect(controller[method](buildEvent({ sub: "host-1", path, body }))).rejects.toBe(failure);
      expect(mockIntegrationService[serviceMethod]).not.toHaveBeenCalled();
    });

    test("acts on the logged in user's own integration", async () => {
      mockAccounts.getById.mockResolvedValue({ id: "integration-1", userId: "host-1" });
      mockIntegrationService[serviceMethod].mockResolvedValue({ statusCode: 200, response: {} });

      await controller[method](buildEvent({ sub: "host-1", path, body }));

      expect(mockIntegrationService[serviceMethod]).toHaveBeenCalledWith(...expectedArgs);
    });
  });
});
