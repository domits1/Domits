import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { AuthManager } from "../../functions/PropertyHandler/auth/authManager.js";
import { DirectBookingWebsiteRatePlanService } from "../../functions/PropertyHandler/business/service/directBookingWebsiteRatePlanService.js";
import { DirectBookingWebsiteRatePlanRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteRatePlanRepository.js";
import { buildRatePlanStore, uniqueViolation } from "./support/ratePlanGrantStore.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const ENV_NAME = "PROPERTY_REVIEW_ADMIN_USER_IDS";
const NOW = Date.parse("2026-11-09T12:00:00.000Z");
const END_DATE = "2027-05-01T00:00:00Z";
const REASON = "Pilot host for the Elite website";
const GENERIC_MESSAGE = "Something went wrong, please contact support.";
const NOT_ADMIN_MESSAGE = "You are not allowed to grant website plans.";

const cognitoUser = (username, group) => ({
  Username: username,
  UserAttributes: [{ Name: "custom:group", Value: group }],
});

const USERS_BY_TOKEN = {
  "admin-token": cognitoUser("admin-1", "Host"),
  "host-token": cognitoUser("host-1", "Host"),
  "guest-token": cognitoUser("guest-1", "Guest"),
};
const USERS_BY_ID = Object.fromEntries(Object.values(USERS_BY_TOKEN).map((user) => [user.Username, user]));

const cognitoError = (name, message) => Object.assign(new Error(message), { name });

const essentialsRow = (overrides = {}) => ({
  id: "plan-essentials",
  account_id: "host-1",
  plan: "essentials",
  price_cents: 0,
  currency: "EUR",
  billing_frequency: "monthly",
  status: "ACTIVE",
  effective_from: new Date("2026-10-01T00:00:00.000Z"),
  effective_until: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  created_at: new Date("2026-10-01T00:00:00.000Z"),
  updated_at: new Date("2026-10-01T00:00:00.000Z"),
  ...overrides,
});

const grantEvent = ({ token = "admin-token", body, headers } = {}) => ({
  httpMethod: "POST",
  resource: "/property/website/rate-plan/grant",
  headers: headers === undefined ? { Authorization: token } : headers,
  body:
    typeof body === "string"
      ? body
      : JSON.stringify({ accountId: "host-1", effectiveUntil: END_DATE, reason: REASON, ...body }),
});

const parse = (response) => JSON.parse(response.body);

describe("PropertyController.grantWebsiteRatePlan", () => {
  let originalAdmins;
  let controller;
  let tokenLookup;
  let accountLookup;
  let infoSpy;

  const useStore = (options) => buildRatePlanStore({ plans: [essentialsRow()], ...options });

  beforeEach(() => {
    originalAdmins = process.env[ENV_NAME];
    process.env[ENV_NAME] = "admin-1";
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    infoSpy = jest.spyOn(console, "info").mockImplementation(() => undefined);

    tokenLookup = jest.fn(async (token) => {
      if (!USERS_BY_TOKEN[token]) throw cognitoError("NotAuthorizedException", "Invalid Access Token");
      return USERS_BY_TOKEN[token];
    });
    accountLookup = jest.fn(async (id) => {
      if (!USERS_BY_ID[id]) throw cognitoError("UserNotFoundException", "User does not exist.");
      return USERS_BY_ID[id];
    });

    controller = new PropertyController();
    controller.authManager = new AuthManager();
    controller.authManager.cognitoRepository = { getUserByAccessToken: tokenLookup };
    controller.directBookingWebsiteRatePlanService = new DirectBookingWebsiteRatePlanService(
      new DirectBookingWebsiteRatePlanRepository(),
      {},
      { getUserById: accountLookup },
      () => NOW
    );
  });

  afterEach(() => {
    if (originalAdmins === undefined) {
      delete process.env[ENV_NAME];
    } else {
      process.env[ENV_NAME] = originalAdmins;
    }
    jest.restoreAllMocks();
  });

  const expectNothingWritten = (store) => {
    expect(store.attempts).toHaveLength(0);
    expect(store.plans).toEqual([essentialsRow()]);
    expect(store.events).toHaveLength(0);
  };

  it("grants Elite to the named host for an admin and answers the new plan without caching", async () => {
    const store = useStore();

    const response = await controller.grantWebsiteRatePlan(grantEvent());

    expect(response.statusCode).toBe(200);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(response.headers["Access-Control-Allow-Origin"]).toBe("*");
    const body = parse(response);
    expect(body.action).toBe("granted");
    expect(body.plan).toMatchObject({ accountId: "host-1", plan: "elite", priceCents: 0, status: "ACTIVE" });
    expect(new Date(body.plan.effectiveUntil).toISOString()).toBe("2027-05-01T00:00:00.000Z");
    expect(store.plans.find((row) => row.status === "ACTIVE")).toMatchObject({ account_id: "host-1", plan: "elite" });
    expect(store.events).toHaveLength(1);
    expect(JSON.parse(store.events[0].payload_json)).toMatchObject({ actorId: "admin-1", reason: REASON });
    expect(tokenLookup).toHaveBeenCalledWith("admin-token");
  });

  it("logs one line with the admin, the host and the new plan, without the free-text reason", async () => {
    useStore();

    const body = parse(await controller.grantWebsiteRatePlan(grantEvent()));

    expect(infoSpy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(infoSpy.mock.calls[0][0]);
    expect(line).toEqual({
      event: "website_plan_grant",
      action: "granted",
      actorId: "admin-1",
      accountId: "host-1",
      planId: body.plan.id,
      effectiveUntil: body.plan.effectiveUntil,
    });
    expect(infoSpy.mock.calls[0][0]).not.toContain(REASON);
  });

  it("reads the admin from the token and ignores an actorId in the body", async () => {
    const store = useStore();

    const response = await controller.grantWebsiteRatePlan(grantEvent({ body: { actorId: "host-1" } }));

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(store.events[0].payload_json).actorId).toBe("admin-1");
  });

  it.each([
    ["no token", { headers: {} }, 401, "You must be logged in."],
    ["no headers at all", { headers: null }, 401, "You must be logged in."],
    ["an expired token", { token: "expired-token" }, 401, "You must be logged in."],
    ["an invalid token", { token: "not-a-token" }, 401, "You must be logged in."],
    ["a host token, granting himself", { token: "host-token" }, 403, NOT_ADMIN_MESSAGE],
    [
      "a host token, granting another host",
      { token: "host-token", body: { accountId: "guest-1" } },
      403,
      NOT_ADMIN_MESSAGE,
    ],
    ["a guest token", { token: "guest-token" }, 403, NOT_ADMIN_MESSAGE],
  ])("refuses %s and writes nothing", async (_label, eventOptions, statusCode, message) => {
    const store = useStore();

    const response = await controller.grantWebsiteRatePlan(grantEvent(eventOptions));

    expect(response.statusCode).toBe(statusCode);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(parse(response)).toEqual({ message });
    expect(accountLookup).not.toHaveBeenCalled();
    expectNothingWritten(store);
  });

  it.each([undefined, ""])("refuses every caller with a 403 when the admin list is %j", async (admins) => {
    if (admins === undefined) {
      delete process.env[ENV_NAME];
    } else {
      process.env[ENV_NAME] = admins;
    }
    const store = useStore();

    const response = await controller.grantWebsiteRatePlan(grantEvent());

    expect(response.statusCode).toBe(403);
    expectNothingWritten(store);
  });

  it.each(["admin-1", " admin-1 "])("refuses an admin who grants his own account %j", async (accountId) => {
    const store = useStore();

    const response = await controller.grantWebsiteRatePlan(grantEvent({ body: { accountId } }));

    expect(response.statusCode).toBe(403);
    expect(parse(response)).toEqual({ message: "A website plan cannot be granted to your own account." });
    expect(accountLookup).not.toHaveBeenCalled();
    expectNothingWritten(store);
  });

  it.each([
    ["no token", { headers: {} }, 401],
    ["a host token", { token: "host-token" }, 403],
  ])("checks the token before the body, so %s with a broken body still answers %s", async (_label, options, status) => {
    const store = useStore();

    const response = await controller.grantWebsiteRatePlan(grantEvent({ ...options, body: "{" }));

    expect(response.statusCode).toBe(status);
    expectNothingWritten(store);
  });

  it.each([
    ["a body that is not JSON", "{", "Request body must be valid JSON."],
    ["a null body", "null", "Request body must be a JSON object."],
    ["an array body", "[]", "Request body must be a JSON object."],
    ["a string body", '"grant"', "Request body must be a JSON object."],
    ["an empty body", "", "accountId must be 1 to 255 characters."],
    [
      "a missing reason",
      JSON.stringify({ accountId: "host-1", effectiveUntil: END_DATE }),
      "reason must be 1 to 500 characters.",
    ],
    [
      "an end date too far ahead",
      JSON.stringify({ accountId: "host-1", effectiveUntil: "2028-01-01T00:00:00Z", reason: REASON }),
      "effectiveUntil must be at most 366 days from now.",
    ],
  ])("answers 400 for %s from an admin and writes nothing", async (_label, body, message) => {
    const store = useStore();

    const response = await controller.grantWebsiteRatePlan(grantEvent({ body }));

    expect(response.statusCode).toBe(400);
    expect(parse(response)).toEqual({ message });
    expectNothingWritten(store);
  });

  it.each([
    ["an account that is not a host", "guest-1"],
    ["an account that does not exist", "host-unknown"],
  ])("answers 404 for %s and writes nothing", async (_label, accountId) => {
    const store = useStore();

    const response = await controller.grantWebsiteRatePlan(grantEvent({ body: { accountId } }));

    expect(response.statusCode).toBe(404);
    expect(parse(response)).toEqual({ message: "No host account exists with this id." });
    expectNothingWritten(store);
  });

  it("answers 409 with the code paid_plan_active for a host who pays, and changes nothing", async () => {
    const paidRow = essentialsRow({ id: "plan-paid", plan: "elite", stripe_subscription_id: "sub_1" });
    const store = buildRatePlanStore({ plans: [paidRow] });

    const response = await controller.grantWebsiteRatePlan(grantEvent());

    expect(response.statusCode).toBe(409);
    expect(parse(response)).toEqual({
      message: "This host pays for a website plan subscription, so a plan cannot be granted.",
      code: "paid_plan_active",
    });
    expect(store.plans).toEqual([paidRow]);
    expect(store.events).toHaveLength(0);
  });

  it("answers 409 with the code conflict when the plan changed at the same time, and changes nothing", async () => {
    const store = useStore({ commitFailures: [uniqueViolation()] });

    const response = await controller.grantWebsiteRatePlan(grantEvent());

    expect(response.statusCode).toBe(409);
    expect(parse(response)).toEqual({
      message: "The website plan of this host was changed at the same time. Check the current plan and try again.",
      code: "conflict",
    });
    expect(store.plans).toEqual([essentialsRow()]);
    expect(store.events).toHaveLength(0);
  });

  it("answers 503 without a code while the plan table is missing", async () => {
    const missingTable = Object.assign(new Error('relation "direct_booking_website_rate_plans" does not exist'), {
      code: "42P01",
    });
    useStore({ commitFailures: [missingTable] });

    const response = await controller.grantWebsiteRatePlan(grantEvent());

    expect(response.statusCode).toBe(503);
    expect(Object.keys(parse(response))).toEqual(["message"]);
  });

  it.each([
    [
      "the token lookup fails",
      () => tokenLookup.mockRejectedValue(cognitoError("TooManyRequestsException", "raw detail")),
    ],
    [
      "the host lookup fails",
      () => accountLookup.mockRejectedValue(cognitoError("InternalErrorException", "raw detail")),
    ],
    [
      "the database fails",
      () => useStore({ commitFailures: [Object.assign(new Error("raw detail"), { code: "08006" })] }),
    ],
  ])("answers a plain 500 when %s, without the raw error", async (_label, arrange) => {
    useStore();
    arrange();

    const response = await controller.grantWebsiteRatePlan(grantEvent());

    expect(response.statusCode).toBe(500);
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(parse(response)).toEqual({ message: GENERIC_MESSAGE });
  });
});
