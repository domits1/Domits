import { handler } from "../index.js";

const parseBody = (response) => JSON.parse(response.body);

describe("AutomatedMessaging HTTP authorization responses", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test("returns 401 when trusted Cognito claims are missing", async () => {
    const response = await handler({ httpMethod: "GET", path: "/automations" });

    expect(response.statusCode).toBe(401);
    expect(parseBody(response)).toEqual({
      error: "UNAUTHORIZED",
      message: "Unable to establish an authenticated user.",
    });
  });

  test("returns 403 when an authenticated guest calls the host API", async () => {
    const response = await handler({
      httpMethod: "GET",
      path: "/automations",
      requestContext: {
        authorizer: { claims: { sub: "guest-1", "custom:group": "Guest" } },
      },
    });

    expect(response.statusCode).toBe(403);
    expect(parseBody(response)).toEqual({
      error: "FORBIDDEN",
      message: "Host access is required.",
    });
  });
});
