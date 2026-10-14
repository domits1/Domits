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
