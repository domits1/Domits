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

  test("keeps OPTIONS unauthenticated with acceptance CORS headers", async () => {
    const response = await handler({
      httpMethod: "OPTIONS",
      path: "/automations",
      headers: {
        Origin: "https://acceptance.domits.com",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual(
      expect.objectContaining({
        "Access-Control-Allow-Origin": "https://acceptance.domits.com",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
      })
    );
    expect(parseBody(response)).toBeNull();
  });

  test.each([
    { httpMethod: "GET", path: "/not-automations" },
    { httpMethod: "POST", path: "/automations/id/activate/extra" },
    { httpMethod: "DELETE", path: "/automations/id" },
  ])("returns 404 for invalid route $httpMethod $path", async (event) => {
    const response = await handler(event);

    expect(response.statusCode).toBe(404);
    expect(parseBody(response)).toEqual({ error: "NOT_FOUND", message: "Not Found" });
  });
});
