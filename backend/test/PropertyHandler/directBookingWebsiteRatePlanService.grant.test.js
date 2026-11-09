import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { DirectBookingWebsiteRatePlanService } from "../../functions/PropertyHandler/business/service/directBookingWebsiteRatePlanService.js";
import { WebsitePlanGrantError } from "../../functions/PropertyHandler/util/exception/WebsitePlanGrantError.js";
import { NotFoundException } from "../../functions/PropertyHandler/util/exception/NotFoundException.js";

const NOW = Date.parse("2026-11-09T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const isoAt = (ms) => new Date(ms).toISOString();

const request = (overrides = {}) => ({
  actorId: "admin-1",
  accountId: "host-1",
  effectiveUntil: "2027-05-01T00:00:00Z",
  reason: "Pilot host for the Elite website",
  ...overrides,
});

const cognitoUser = (username, group = "Host") => ({
  Username: username,
  UserAttributes: [
    { Name: "sub", Value: "sub-1" },
    { Name: "custom:group", Value: group },
  ],
});

const grantedRow = {
  id: "plan-grant",
  account_id: "host-1",
  plan: "elite",
  price_cents: 0,
  currency: "EUR",
  billing_frequency: "monthly",
  status: "ACTIVE",
  effective_from: new Date(NOW),
  effective_until: new Date("2027-05-01T00:00:00.000Z"),
  stripe_customer_id: null,
  stripe_subscription_id: null,
};

const replacedRow = (overrides = {}) => ({
  id: "plan-old",
  plan: "essentials",
  effective_from: new Date(NOW - DAY_MS),
  effective_until: null,
  stripe_subscription_id: null,
  ...overrides,
});

describe("DirectBookingWebsiteRatePlanService.grantElite", () => {
  let repository;
  let cognitoRepository;
  let service;

  beforeEach(() => {
    repository = { grantElitePlan: jest.fn().mockResolvedValue({ plan: grantedRow, replacedPlans: [replacedRow()] }) };
    cognitoRepository = { getUserById: jest.fn(async (id) => cognitoUser(id)) };
    service = new DirectBookingWebsiteRatePlanService(repository, {}, cognitoRepository, () => NOW);
  });

  const expectNothingWritten = () => expect(repository.grantElitePlan).not.toHaveBeenCalled();

  it("grants Elite to a Host with the checked and trimmed values", async () => {
    const result = await service.grantElite(request({ accountId: " host-1 ", reason: "  Pilot host  " }));

    expect(cognitoRepository.getUserById).toHaveBeenCalledWith("host-1");
    expect(repository.grantElitePlan).toHaveBeenCalledWith({
      actorId: "admin-1",
      accountId: "host-1",
      effectiveUntil: new Date("2027-05-01T00:00:00.000Z"),
      reason: "Pilot host",
    });
    expect(result.action).toBe("granted");
    expect(result.plan).toMatchObject({
      id: "plan-grant",
      plan: "elite",
      priceCents: 0,
      status: "ACTIVE",
      effectiveUntil: grantedRow.effective_until,
      stripeSubscriptionId: null,
    });
    expect(result.plan.entitlements).toContain("website.unlimited_pages");
  });

  it.each([
    ["a running grant", replacedRow({ plan: "elite", effective_until: new Date(NOW + DAY_MS) }), "extended"],
    ["an Elite plan without an end date", replacedRow({ plan: "elite" }), "extended"],
    ["an Essentials plan", replacedRow(), "granted"],
    ["a grant that ended at this moment", replacedRow({ plan: "elite", effective_until: new Date(NOW) }), "granted"],
    ["a grant that starts later", replacedRow({ plan: "elite", effective_from: new Date(NOW + 1) }), "granted"],
  ])("answers %s replaced as %s", async (_label, replaced, action) => {
    repository.grantElitePlan.mockResolvedValue({ plan: grantedRow, replacedPlans: [replaced] });

    await expect(service.grantElite(request())).resolves.toMatchObject({ action });
  });

  it.each([
    ["exactly 366 days ahead", { effectiveUntil: isoAt(NOW + 366 * DAY_MS) }],
    ["a time zone offset", { effectiveUntil: "2027-05-01T02:00:00+02:00" }],
    ["milliseconds", { effectiveUntil: "2027-05-01T00:00:00.250Z" }],
    ["microseconds", { effectiveUntil: "2027-05-01T00:00:00.123456Z" }],
    ["a reason of 500 characters", { reason: "r".repeat(500) }],
    ["an account id of 255 characters", { accountId: "h".repeat(255) }],
  ])("accepts %s", async (_label, overrides) => {
    await service.grantElite(request(overrides));

    expect(repository.grantElitePlan).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no actor", { actorId: undefined }],
    ["a blank actor", { actorId: "   " }],
    ["no account id", { accountId: undefined }],
    ["a number as account id", { accountId: 42 }],
    ["an account id of 256 characters", { accountId: "h".repeat(256) }],
    ["no reason", { reason: undefined }],
    ["a blank reason", { reason: "   " }],
    ["a reason of 501 characters", { reason: "r".repeat(501) }],
    ["no end date", { effectiveUntil: undefined }],
    ["an end date as a number", { effectiveUntil: NOW + DAY_MS }],
    ["a date without a time", { effectiveUntil: "2027-05-01" }],
    ["a time without a time zone", { effectiveUntil: "2027-05-01T00:00:00" }],
    ["a space instead of the T", { effectiveUntil: "2027-05-01 00:00:00Z" }],
    ["a day that does not exist", { effectiveUntil: "2027-02-30T00:00:00Z" }],
    ["a month that does not exist", { effectiveUntil: "2027-13-01T00:00:00Z" }],
    ["hour 24", { effectiveUntil: "2027-05-01T24:00:00Z" }],
    ["an end date in the past", { effectiveUntil: isoAt(NOW - 1) }],
    ["an end date of right now", { effectiveUntil: isoAt(NOW) }],
    ["an end date one millisecond past 366 days", { effectiveUntil: isoAt(NOW + 366 * DAY_MS + 1) }],
  ])("refuses %s with a 400 before any lookup", async (_label, overrides) => {
    await expect(service.grantElite(request(overrides))).rejects.toMatchObject({ statusCode: 400 });

    expect(cognitoRepository.getUserById).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it("refuses a missing request with a 400", async () => {
    await expect(service.grantElite(null)).rejects.toMatchObject({ statusCode: 400 });

    expectNothingWritten();
  });

  it("refuses to grant the admin's own account", async () => {
    await expect(service.grantElite(request({ accountId: " admin-1" }))).rejects.toMatchObject({ statusCode: 403 });

    expect(cognitoRepository.getUserById).not.toHaveBeenCalled();
    expectNothingWritten();
  });

  it.each([
    ["Cognito does not know the id", () => Promise.reject(Object.assign(new Error("gone"), { name: "UserNotFoundException" }))],
    ["the lookup answers not found", () => Promise.reject(new NotFoundException("User not found."))],
    ["the id is an alias of another account", () => Promise.resolve(cognitoUser("host-9"))],
    ["the account is a Guest", () => Promise.resolve(cognitoUser("host-1", "Guest"))],
    ["the account has no attributes", () => Promise.resolve({ Username: "host-1" })],
  ])("answers 404 when %s", async (_label, lookup) => {
    cognitoRepository.getUserById.mockImplementation(lookup);

    await expect(service.grantElite(request())).rejects.toMatchObject({ statusCode: 404 });

    expectNothingWritten();
  });

  it("passes a failed account lookup through without writing", async () => {
    const failure = Object.assign(new Error("Rate exceeded"), { name: "TooManyRequestsException" });
    cognitoRepository.getUserById.mockRejectedValue(failure);

    await expect(service.grantElite(request())).rejects.toBe(failure);

    expectNothingWritten();
  });

  it("passes the refusal for a paid subscription through", async () => {
    const refusal = new WebsitePlanGrantError("paid_plan_active");
    repository.grantElitePlan.mockRejectedValue(refusal);

    await expect(service.grantElite(request())).rejects.toBe(refusal);
  });

  it("answers 503 when the plan table is missing", async () => {
    repository.grantElitePlan.mockRejectedValue(Object.assign(new Error("relation does not exist"), { code: "42P01" }));

    await expect(service.grantElite(request())).rejects.toMatchObject({ statusCode: 503 });
  });
});
