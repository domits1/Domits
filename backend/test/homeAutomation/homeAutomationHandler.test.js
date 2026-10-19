import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { handleHomeAutomationEvent } from "../../functions/.shared/homeAutomation/handler/homeAutomationHandler.js";

const BASE = "/default/integrations/home-automation/remotelocks";
const TOKEN_TEXT = "refresh-token-bbb";

const makeService = () => ({
  startConnect: jest.fn(async () => ({ statusCode: 200, response: { status: "CONNECTING" } })),
  completeConnect: jest.fn(async () => ({ statusCode: 200, response: { status: "CONNECTED" } })),
  getStatus: jest.fn(async () => ({ statusCode: 200, response: { status: "NOT_CONNECTED" } })),
  disconnect: jest.fn(async () => ({ statusCode: 200, response: { status: "DISCONNECTED" } })),
});

const event = (httpMethod, route, { sub = "user-1", body, query } = {}) => ({
  httpMethod,
  path: `${BASE}${route}`,
  queryStringParameters: query ?? null,
  body: body === undefined ? null : JSON.stringify(body),
  requestContext: sub ? { authorizer: { claims: { sub } } } : {},
});

afterEach(() => jest.restoreAllMocks());

describe("handleHomeAutomationEvent", () => {
  it.each([
    ["POST", "/connect", "startConnect"],
    ["POST", "/connect/complete", "completeConnect"],
    ["GET", "/status", "getStatus"],
    ["POST", "/disconnect", "disconnect"],
  ])("routes %s %s to %s with the id from the token", async (method, route, serviceMethod) => {
    const service = makeService();

    const staged = event(method, route, { body: { code: "c", state: "s" } });
    // A proxy event path may or may not start with the stage.
    const unstaged = { ...staged, path: staged.path.replace("/default", "") };

    const response = await handleHomeAutomationEvent(staged, { service });
    await handleHomeAutomationEvent(unstaged, { service });

    expect(response.statusCode).toBe(200);
    expect(service[serviceMethod]).toHaveBeenCalledTimes(2);
    expect(service[serviceMethod].mock.calls[0][0]).toBe("user-1");
  });

  it("passes the code and state to completeConnect", async () => {
    const service = makeService();

    await handleHomeAutomationEvent(event("POST", "/connect/complete", { body: { code: "c", state: "s" } }), {
      service,
    });

    expect(service.completeConnect).toHaveBeenCalledWith("user-1", { code: "c", state: "s" });
  });

  it("takes the user only from the token, whatever the body or the query string say", async () => {
    const service = makeService();
    const forged = { userId: "attacker", code: "c", state: "s" };

    await handleHomeAutomationEvent(
      event("POST", "/connect/complete", { body: forged, query: { userId: "attacker" } }),
      { service }
    );
    await handleHomeAutomationEvent(event("GET", "/status", { query: { userId: "attacker" } }), { service });

    expect(service.completeConnect.mock.calls[0][0]).toBe("user-1");
    expect(service.getStatus.mock.calls[0][0]).toBe("user-1");
  });

  it("answers 401 without calling the service when the token has no subject", async () => {
    const service = makeService();

    const response = await handleHomeAutomationEvent(event("POST", "/connect", { sub: null }), { service });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: "UNAUTHORIZED" });
    Object.values(service).forEach((method) => expect(method).not.toHaveBeenCalled());
  });

  it("answers the CORS preflight without a token", async () => {
    const service = makeService();

    const response = await handleHomeAutomationEvent(event("OPTIONS", "/connect", { sub: null }), { service });

    expect(response).toMatchObject({ statusCode: 200, body: "" });
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it.each([
    ["an unknown route", "POST", "/devices"],
    ["a wrong method", "GET", "/connect"],
  ])("answers 404 for %s", async (_label, method, route) => {
    const service = makeService();

    const response = await handleHomeAutomationEvent(event(method, route), { service });

    expect(response.statusCode).toBe(404);
    Object.values(service).forEach((serviceMethod) => expect(serviceMethod).not.toHaveBeenCalled());
  });

  it("returns null for paths that are not its own, so the Lambda goes on to its other routes", async () => {
    const other = { httpMethod: "GET", path: "/default/integrations/channex/status" };

    await expect(handleHomeAutomationEvent(other, { service: makeService() })).resolves.toBeNull();
  });

  it("answers a fixed 500 and logs only the error name when the service throws", async () => {
    const service = makeService();
    service.getStatus.mockRejectedValue(new TypeError(`boom ${TOKEN_TEXT}`));
    const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await handleHomeAutomationEvent(event("GET", "/status"), { service });

    expect(response.statusCode).toBe(500);
    expect(JSON.stringify([response, errorLog.mock.calls])).not.toContain(TOKEN_TEXT);
  });
});
