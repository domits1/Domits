const { CommunicationPreferencesController } = require("../../functions/communication-preferences/controller/controller.js");

const validPreferences = {
  reservation: { email: true, sms: false, push: true },
  cancellation: { email: true, sms: true, push: true },
  messages: { email: true, sms: false, push: true },
};

const authenticatedEvent = (patch = {}) => ({
  requestContext: {
    authorizer: {
      claims: {
        sub: "user-1",
        "custom:group": "Guest",
      },
    },
  },
  queryStringParameters: { persona: "host" },
  pathParameters: null,
  ...patch,
});

const createController = () => {
  const service = {
    getPreferences: jest.fn(async () => validPreferences),
    savePreferences: jest.fn(async () => validPreferences),
  };
  return {
    service,
    controller: new CommunicationPreferencesController({ service }),
  };
};

describe("CommunicationPreferencesController", () => {
  test("GET uses claims.sub and normalized persona", async () => {
    const { controller, service } = createController();

    await expect(controller.getPreferences(authenticatedEvent())).resolves.toEqual({
      statusCode: 200,
      response: validPreferences,
    });
    expect(service.getPreferences).toHaveBeenCalledWith("user-1", "HOST");
  });

  test("GET supports guest persona for the same current-user endpoint", async () => {
    const { controller, service } = createController();

    await controller.getPreferences(authenticatedEvent({ queryStringParameters: { persona: "guest" } }));

    expect(service.getPreferences).toHaveBeenCalledWith("user-1", "GUEST");
  });

  test("PUT parses the complete matrix and uses claims.sub plus normalized persona", async () => {
    const { controller, service } = createController();
    const event = authenticatedEvent({ body: JSON.stringify(validPreferences) });

    await expect(controller.updatePreferences(event)).resolves.toEqual({
      statusCode: 200,
      response: validPreferences,
    });
    expect(service.savePreferences).toHaveBeenCalledWith("user-1", "HOST", validPreferences);
  });

  test("supports HTTP API jwt authorizer claims", async () => {
    const { controller, service } = createController();
    const event = {
      body: JSON.stringify(validPreferences),
      queryStringParameters: { persona: "guest" },
      requestContext: {
        authorizer: {
          jwt: {
            claims: {
              sub: "jwt-user-1",
            },
          },
        },
      },
    };

    await controller.updatePreferences(event);

    expect(service.savePreferences).toHaveBeenCalledWith("jwt-user-1", "GUEST", validPreferences);
  });

  test("missing persona is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.getPreferences(authenticatedEvent({ queryStringParameters: null }))).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
    expect(service.getPreferences).not.toHaveBeenCalled();
  });

  test("invalid persona is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.updatePreferences(authenticatedEvent({
      queryStringParameters: { persona: "admin" },
      body: JSON.stringify(validPreferences),
    }))).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(service.savePreferences).not.toHaveBeenCalled();
  });

  test("missing auth is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.getPreferences({ queryStringParameters: { persona: "host" } })).rejects.toMatchObject({
      statusCode: 401,
      code: "UNAUTHORIZED",
    });
    expect(service.getPreferences).not.toHaveBeenCalled();
  });

  test("auth without sub is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.getPreferences(authenticatedEvent({
      requestContext: { authorizer: { claims: { username: "user-1" } } },
    }))).rejects.toMatchObject({ statusCode: 401, code: "UNAUTHORIZED" });
    expect(service.getPreferences).not.toHaveBeenCalled();
  });

  test("invalid JSON body is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.updatePreferences(authenticatedEvent({ body: "not-json" }))).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
    expect(service.savePreferences).not.toHaveBeenCalled();
  });

  test("missing body is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.updatePreferences(authenticatedEvent())).rejects.toMatchObject({
      statusCode: 400,
      code: "BAD_REQUEST",
    });
    expect(service.savePreferences).not.toHaveBeenCalled();
  });

  test("query userId spoofing is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.getPreferences(authenticatedEvent({
      queryStringParameters: { persona: "host", userId: "other-user" },
    }))).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(service.getPreferences).not.toHaveBeenCalled();
  });

  test("path userId spoofing is rejected", async () => {
    const { controller, service } = createController();

    await expect(controller.updatePreferences(authenticatedEvent({
      pathParameters: { user_id: "other-user" },
      body: JSON.stringify(validPreferences),
    }))).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });
    expect(service.savePreferences).not.toHaveBeenCalled();
  });
});


describe("CommunicationPreferencesController host notification matrix scope", () => {
  const matrix = {
    bookings: { bookingCreated: true },
    propertyManager: { newBooking: false },
    propertyOwner: { ownerNewBooking: true },
    finance: { guestPaymentReceived: true },
    distribution: { listingPublished: false },
    compliance: { kycRequested: true },
  };

  const createMatrixController = () => {
    const hostNotificationPreferencesService = {
      getPreferences: jest.fn(async () => matrix),
      savePreferences: jest.fn(async () => matrix),
    };
    const service = {
      getPreferences: jest.fn(async () => validPreferences),
      savePreferences: jest.fn(async () => validPreferences),
    };
    return {
      hostNotificationPreferencesService,
      service,
      controller: new CommunicationPreferencesController({ service, hostNotificationPreferencesService }),
    };
  };

  test("GET scope=matrix loads the host event preferences using authenticated claims", async () => {
    const { controller, hostNotificationPreferencesService, service } = createMatrixController();

    await expect(controller.getPreferences(authenticatedEvent({
      queryStringParameters: { persona: "host", scope: "matrix" },
      requestContext: { authorizer: { claims: { sub: "user-1", "custom:group": "Host" } } },
    }))).resolves.toEqual({ statusCode: 200, response: matrix });

    expect(hostNotificationPreferencesService.getPreferences).toHaveBeenCalledWith("user-1", {
      sub: "user-1",
      "custom:group": "Guest",
    });
    expect(service.getPreferences).not.toHaveBeenCalled();
  });

  test("PUT scope=matrix saves the host event preferences", async () => {
    const { controller, hostNotificationPreferencesService, service } = createMatrixController();

    await expect(controller.updatePreferences(authenticatedEvent({
      queryStringParameters: { persona: "host", scope: "matrix" },
      body: JSON.stringify(matrix),
      requestContext: { authorizer: { claims: { sub: "user-1", "custom:group": "Host" } } },
    }))).resolves.toEqual({ statusCode: 200, response: matrix });

    expect(hostNotificationPreferencesService.savePreferences).toHaveBeenCalledWith(
      "user-1",
      { sub: "user-1", "custom:group": "Host" },
      matrix
    );
    expect(service.savePreferences).not.toHaveBeenCalled();
  });

  test("matrix scope rejects the guest persona", async () => {
    const { controller, hostNotificationPreferencesService } = createMatrixController();

    await expect(controller.getPreferences(authenticatedEvent({
      queryStringParameters: { persona: "guest", scope: "matrix" },
    }))).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });

    expect(hostNotificationPreferencesService.getPreferences).not.toHaveBeenCalled();
  });

  test("unknown preference scopes are rejected", async () => {
    const { controller, service } = createMatrixController();

    await expect(controller.getPreferences(authenticatedEvent({
      queryStringParameters: { persona: "host", scope: "other" },
    }))).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" });

    expect(service.getPreferences).not.toHaveBeenCalled();
  });
});


test("matrix scope rejects accounts outside the Host Dashboard roles", async () => {
  const hostNotificationPreferencesService = {
    getPreferences: jest.fn(),
    savePreferences: jest.fn(),
  };
  const controller = new CommunicationPreferencesController({
    service: { getPreferences: jest.fn(), savePreferences: jest.fn() },
    hostNotificationPreferencesService,
  });

  await expect(controller.getPreferences(authenticatedEvent({
    queryStringParameters: { persona: "host", scope: "matrix" },
  }))).rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });

  expect(hostNotificationPreferencesService.getPreferences).not.toHaveBeenCalled();
});
