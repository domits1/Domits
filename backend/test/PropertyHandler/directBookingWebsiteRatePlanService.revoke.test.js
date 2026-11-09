import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { DirectBookingWebsiteRatePlanService } from "../../functions/PropertyHandler/business/service/directBookingWebsiteRatePlanService.js";
import { WebsitePlanRevokeError } from "../../functions/PropertyHandler/util/exception/WebsitePlanGrantError.js";

const NOW = Date.parse("2026-11-09T12:00:00.000Z");

const request = (overrides = {}) => ({
  actorId: "admin-1",
  accountId: "host-1",
  reason: "The pilot has ended",
  ...overrides,
});

const essentialsRow = {
  id: "plan-essentials",
  account_id: "host-1",
  plan: "essentials",
  price_cents: 0,
  currency: "EUR",
  billing_frequency: "monthly",
  status: "ACTIVE",
  effective_from: new Date(NOW),
  effective_until: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
};

describe("DirectBookingWebsiteRatePlanService.revokeElite", () => {
  let repository;
  let cognitoRepository;
  let service;

  beforeEach(() => {
    repository = {
      revokeElitePlanGrant: jest.fn().mockResolvedValue({ plan: essentialsRow, revokedPlan: { id: "plan-grant" } }),
    };
    cognitoRepository = { getUserById: jest.fn() };
    service = new DirectBookingWebsiteRatePlanService(repository, {}, cognitoRepository, () => NOW);
  });

  it("revokes with the checked and trimmed values and answers the new Essentials plan", async () => {
    const result = await service.revokeElite(request({ accountId: " host-1 ", reason: "  The pilot has ended  " }));

    expect(repository.revokeElitePlanGrant).toHaveBeenCalledWith({
      actorId: "admin-1",
      accountId: "host-1",
      reason: "The pilot has ended",
    });
    expect(result.action).toBe("revoked");
    expect(result.revokedPlanId).toBe("plan-grant");
    expect(result.plan).toMatchObject({ id: "plan-essentials", plan: "essentials", priceCents: 0, effectiveUntil: null });
    expect(result.plan.entitlements).not.toContain("website.unlimited_pages");
    expect(cognitoRepository.getUserById).not.toHaveBeenCalled();
  });

  it.each([
    ["a reason of 500 characters", { reason: "r".repeat(500) }],
    ["an account id of 255 characters", { accountId: "h".repeat(255) }],
    ["the admin's own account", { accountId: "admin-1" }],
  ])("accepts %s", async (_label, overrides) => {
    await service.revokeElite(request(overrides));

    expect(repository.revokeElitePlanGrant).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no request", null],
    ["no actor", request({ actorId: undefined })],
    ["a blank actor", request({ actorId: "   " })],
    ["an actor id of 256 characters", request({ actorId: "a".repeat(256) })],
    ["no account id", request({ accountId: undefined })],
    ["a number as account id", request({ accountId: 42 })],
    ["an account id of 256 characters", request({ accountId: "h".repeat(256) })],
    ["no reason", request({ reason: undefined })],
    ["a blank reason", request({ reason: "   " })],
    ["a reason of 501 characters", request({ reason: "r".repeat(501) })],
  ])("refuses %s with a 400 and writes nothing", async (_label, revokeRequest) => {
    await expect(service.revokeElite(revokeRequest)).rejects.toMatchObject({ statusCode: 400 });

    expect(repository.revokeElitePlanGrant).not.toHaveBeenCalled();
  });

  it("passes a refusal of the repository through", async () => {
    const refusal = new WebsitePlanRevokeError("not_granted");
    repository.revokeElitePlanGrant.mockRejectedValue(refusal);

    await expect(service.revokeElite(request())).rejects.toBe(refusal);
  });

  it("answers 503 when the plan table is missing", async () => {
    repository.revokeElitePlanGrant.mockRejectedValue(Object.assign(new Error("relation does not exist"), { code: "42P01" }));

    await expect(service.revokeElite(request())).rejects.toMatchObject({ statusCode: 503 });
  });
});
