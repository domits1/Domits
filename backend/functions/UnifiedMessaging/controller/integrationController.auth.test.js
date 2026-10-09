const mockIntegrationService = {
  listIntegrations: jest.fn(),
  createIntegration: jest.fn(),
  updateIntegration: jest.fn(),
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

const buildEvent = ({ sub = "host-1", group = "host", query = {}, body = "{}", path = "/default", claimsPatch = {} } = {}) => ({
  body,
  path,
  queryStringParameters: query,
  requestContext: sub
    ? {
        authorizer: {
          claims: { sub, "custom:role": group, ...claimsPatch },
        },
      }
    : {},
});

describe("IntegrationController authentication/authorization", () => {
  let controller;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new IntegrationController({
      integrationService: mockIntegrationService,
      accounts: mockAccounts,
    });
  });

  describe("listIntegrations", () => {
    test("requires authentication", async () => {
      await expect(controller.listIntegrations(buildEvent({ sub: null }))).rejects.toMatchObject({ statusCode: 401 });
      expect(mockIntegrationService.listIntegrations).not.toHaveBeenCalled();
    });

    test("rejects a requested userId that differs from the token user", async () => {
      await expect(
        controller.listIntegrations(buildEvent({ sub: "host-1", query: { userId: "host-2" } }))
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockIntegrationService.listIntegrations).not.toHaveBeenCalled();
    });

    test("matching userId calls the service with the token user's id", async () => {
      mockIntegrationService.listIntegrations.mockResolvedValue({ statusCode: 200, response: [] });

      await controller.listIntegrations(buildEvent({ sub: "host-1", query: { userId: "host-1" } }));

      expect(mockIntegrationService.listIntegrations).toHaveBeenCalledWith("host-1");
    });

    test("missing userId query param calls the service with the token user's id", async () => {
      mockIntegrationService.listIntegrations.mockResolvedValue({ statusCode: 200, response: [] });

      await controller.listIntegrations(buildEvent({ sub: "host-1", query: {} }));

      expect(mockIntegrationService.listIntegrations).toHaveBeenCalledWith("host-1");
    });
  });

  describe("createIntegration", () => {
    test("requires authentication", async () => {
      await expect(
        controller.createIntegration(
          buildEvent({ sub: null, body: JSON.stringify({ userId: "host-1", channel: "WHATSAPP" }) })
        )
      ).rejects.toMatchObject({ statusCode: 401 });
      expect(mockIntegrationService.createIntegration).not.toHaveBeenCalled();
    });

    test("rejects a body userId that differs from the token user", async () => {
      await expect(
        controller.createIntegration(
          buildEvent({ sub: "host-1", body: JSON.stringify({ userId: "host-2", channel: "WHATSAPP" }) })
        )
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockIntegrationService.createIntegration).not.toHaveBeenCalled();
    });

    test("calls the service with the token user's id regardless of body userId", async () => {
      mockIntegrationService.createIntegration.mockResolvedValue({ statusCode: 201, response: {} });

      await controller.createIntegration(buildEvent({ sub: "host-1", body: JSON.stringify({ channel: "WHATSAPP" }) }));

      expect(mockIntegrationService.createIntegration).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "host-1", channel: "WHATSAPP" })
      );
    });
  });

  describe.each([
    ["startWhatsAppConnect", "startWhatsAppConnect"],
    ["completeWhatsAppConnect", "completeWhatsAppConnect"],
    ["selectWhatsAppNumber", "selectWhatsAppNumber"],
    ["disconnectWhatsApp", "disconnectWhatsApp"],
    ["checkWhatsAppTokenHealth", "checkWhatsAppTokenHealth"],
    ["refreshWhatsAppToken", "refreshWhatsAppToken"],
  ])("%s", (controllerMethod, serviceMethod) => {
    test("requires authentication", async () => {
      await expect(
        controller[controllerMethod](buildEvent({ sub: null, body: JSON.stringify({ userId: "host-1" }) }))
      ).rejects.toMatchObject({ statusCode: 401 });
      expect(mockIntegrationService[serviceMethod]).not.toHaveBeenCalled();
    });

    test("rejects a body userId that differs from the token user", async () => {
      await expect(
        controller[controllerMethod](buildEvent({ sub: "host-1", body: JSON.stringify({ userId: "host-2" }) }))
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(mockIntegrationService[serviceMethod]).not.toHaveBeenCalled();
    });

    test("calls the service with the token user's id", async () => {
      mockIntegrationService[serviceMethod].mockResolvedValue({ statusCode: 200, response: {} });

      await controller[controllerMethod](buildEvent({ sub: "host-1", body: JSON.stringify({}) }));

      expect(mockIntegrationService[serviceMethod]).toHaveBeenCalledWith(expect.objectContaining({ userId: "host-1" }));
    });
  });

  describe.each([
    {
      controllerMethod: "updateIntegration",
      serviceMethod: "updateIntegration",
      path: "/default/integrations/integration-1",
      body: JSON.stringify({ displayName: "New name" }),
      expectedArgs: ["integration-1", { displayName: "New name" }],
    },
    {
      controllerMethod: "getIntegrationLogs",
      serviceMethod: "getIntegrationLogs",
      path: "/default/integrations/integration-1/logs",
      body: "{}",
      expectedArgs: ["integration-1", 50],
    },
    {
      controllerMethod: "listIntegrationProperties",
      serviceMethod: "listIntegrationProperties",
      path: "/default/integrations/integration-1/properties",
      body: "{}",
      expectedArgs: ["integration-1"],
    },
    {
      controllerMethod: "triggerMessagesSync",
      serviceMethod: "triggerSync",
      path: "/default/integrations/integration-1/sync/messages",
      body: "{}",
      expectedArgs: ["integration-1", "MESSAGES", {}],
    },
    {
      controllerMethod: "triggerReservationsSync",
      serviceMethod: "triggerSync",
      path: "/default/integrations/integration-1/sync/reservations",
      body: "{}",
      expectedArgs: ["integration-1", "RESERVATIONS", {}],
    },
    {
      controllerMethod: "linkReservation",
      serviceMethod: "linkReservation",
      path: "/default/integrations/integration-1/reservations/link",
      body: JSON.stringify({ channel: "CHANNEX", externalReservationId: "ext-1" }),
      expectedArgs: ["integration-1", { channel: "CHANNEX", externalReservationId: "ext-1" }],
    },
  ])("$controllerMethod", ({ controllerMethod, serviceMethod, path, body, expectedArgs }) => {
    test("requires authentication", async () => {
      await expect(controller[controllerMethod](buildEvent({ sub: null, path, body }))).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(mockAccounts.getById).not.toHaveBeenCalled();
      expect(mockIntegrationService[serviceMethod]).not.toHaveBeenCalled();
    });

    test("integration not found returns 404 and does not call the service", async () => {
      mockAccounts.getById.mockResolvedValue(null);

      await expect(
        controller[controllerMethod](buildEvent({ sub: "host-1", path, body }))
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(mockAccounts.getById).toHaveBeenCalledWith("integration-1");
      expect(mockIntegrationService[serviceMethod]).not.toHaveBeenCalled();
    });

    test("owner mismatch returns 404 and does not call the service", async () => {
      mockAccounts.getById.mockResolvedValue({ id: "integration-1", userId: "host-2" });

      await expect(
        controller[controllerMethod](buildEvent({ sub: "host-1", path, body }))
      ).rejects.toMatchObject({ statusCode: 404, message: "Integration not found." });
      expect(mockIntegrationService[serviceMethod]).not.toHaveBeenCalled();
    });

    test("owner match calls the service", async () => {
      mockAccounts.getById.mockResolvedValue({ id: "integration-1", userId: "host-1" });
      mockIntegrationService[serviceMethod].mockResolvedValue({ statusCode: 200, response: {} });

      await controller[controllerMethod](buildEvent({ sub: "host-1", path, body }));

      expect(mockIntegrationService[serviceMethod]).toHaveBeenCalledWith(...expectedArgs);
    });
  });
});
