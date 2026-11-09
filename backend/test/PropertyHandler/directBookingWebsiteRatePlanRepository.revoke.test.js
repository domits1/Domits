import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  DirectBookingWebsiteRatePlanRepository,
  WEBSITE_PLAN_GRANTED_EVENT,
  WEBSITE_PLAN_GRANT_REVOKED_EVENT,
} from "../../functions/PropertyHandler/data/repository/directBookingWebsiteRatePlanRepository.js";
import { WebsitePlanRevokeError } from "../../functions/PropertyHandler/util/exception/WebsitePlanGrantError.js";
import { DB_NOW, buildRatePlanStore, conflictError, ratePlanRow, uniqueViolation } from "./support/ratePlanGrantStore.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const LAMBDA_NOW = 1_800_000_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const REVOKE = Object.freeze({ accountId: "host-1", actorId: "admin-1", reason: "The pilot has ended" });
const GRANT = Object.freeze({
  accountId: "host-1",
  effectiveUntil: new Date("2027-08-01T00:00:00.000Z"),
  actorId: "admin-2",
  reason: "Pilot host",
});

const RUNNING_GRANT = ratePlanRow({
  id: "plan-grant",
  plan: "elite",
  effective_from: new Date("2026-11-01T00:00:00.000Z"),
  effective_until: new Date("2027-05-01T00:00:00.000Z"),
});
const CURRENT_STATUSES = new Set(["ACTIVE", "PAST_DUE", "TRIALING"]);
const currentRowsOf = (store) => store.plans.filter((row) => CURRENT_STATUSES.has(row.status));
const kindsOf = (operations) => operations.map((operation) => operation.kind);
const payloadsOf = (store) => store.events.map((event) => ({ type: event.event_type, ...JSON.parse(event.payload_json) }));

describe("DirectBookingWebsiteRatePlanRepository.revokeElitePlanGrant", () => {
  let repository;

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(LAMBDA_NOW);
    repository = new DirectBookingWebsiteRatePlanRepository();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("ends the running grant, puts the host on Essentials and writes the audit row in one transaction", async () => {
    const otherHost = ratePlanRow({ ...RUNNING_GRANT, id: "plan-other", account_id: "host-2" });
    const history = ratePlanRow({ id: "plan-history", status: "EXPIRED", effective_until: new Date("2026-11-01") });
    const store = buildRatePlanStore({ plans: [RUNNING_GRANT, otherHost, history] });

    const result = await repository.revokeElitePlanGrant(REVOKE);

    expect(store.attempts.map(kindsOf)).toEqual([["read", "update", "insert", "insert"]]);
    const [revoked, untouchedHost, untouchedHistory, essentials] = store.plans;
    expect(revoked).toMatchObject({ id: "plan-grant", status: "EXPIRED", effective_until: DB_NOW, updated_at: DB_NOW });
    expect(untouchedHost).toEqual(otherHost);
    expect(untouchedHistory).toEqual(history);
    expect(essentials).toMatchObject({
      account_id: "host-1",
      plan: "essentials",
      price_cents: 0,
      status: "ACTIVE",
      effective_from: DB_NOW,
      effective_until: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
    });
    expect(currentRowsOf(store)).toEqual([otherHost, essentials]);
    expect(result).toEqual({ plan: essentials, revokedPlan: RUNNING_GRANT });
    expect(store.events).toHaveLength(1);
    expect(store.events[0]).toMatchObject({
      draft_id: null,
      property_id: null,
      host_id: "host-1",
      event_type: WEBSITE_PLAN_GRANT_REVOKED_EVENT,
      occurred_at: LAMBDA_NOW,
    });
    expect(JSON.parse(store.events[0].payload_json)).toEqual({
      actorId: "admin-1",
      planId: "plan-grant",
      essentialsPlanId: essentials.id,
      effectiveUntil: "2027-05-01T00:00:00.000Z",
      reason: "The pilot has ended",
    });
  });

  it("revokes an Elite plan without a subscription and without an end date", async () => {
    const store = buildRatePlanStore({ plans: [ratePlanRow({ id: "plan-open", plan: "elite" })] });

    await repository.revokeElitePlanGrant(REVOKE);

    expect(currentRowsOf(store)).toEqual([expect.objectContaining({ plan: "essentials" })]);
    expect(JSON.parse(store.events[0].payload_json)).toMatchObject({ planId: "plan-open", effectiveUntil: null });
  });

  it.each(["ACTIVE", "PAST_DUE", "TRIALING"])(
    "refuses a host whose %s plan has a subscription and changes nothing",
    async (status) => {
      const paid = ratePlanRow({ id: "plan-paid", plan: "elite", price_cents: 4300, status, stripe_subscription_id: "sub_1" });
      const store = buildRatePlanStore({ plans: [paid] });

      const outcome = repository.revokeElitePlanGrant(REVOKE);

      await expect(outcome).rejects.toBeInstanceOf(WebsitePlanRevokeError);
      await expect(outcome).rejects.toMatchObject({
        code: "paid_plan_active",
        statusCode: 409,
        message: "This host pays for a website plan subscription, so the plan cannot be revoked.",
      });
      expect(store.plans).toEqual([paid]);
      expect(store.events).toEqual([]);
      expect(store.attempts.map(kindsOf)).toEqual([["read"]]);
    }
  );

  it.each([
    ["an Essentials plan", [ratePlanRow()]],
    ["no plan row", []],
    ["a grant whose end date has passed", [{ ...RUNNING_GRANT, effective_until: new Date("2026-11-05") }]],
    ["a grant that ends at this moment", [{ ...RUNNING_GRANT, effective_until: DB_NOW }]],
    ["a grant that starts later", [{ ...RUNNING_GRANT, effective_from: new Date(DB_NOW.getTime() + DAY_MS) }]],
    ["an expired grant", [{ ...RUNNING_GRANT, status: "EXPIRED" }]],
    ["only another host's grant", [{ ...RUNNING_GRANT, account_id: "host-2" }]],
  ])("answers not_granted for %s and changes nothing", async (_label, plans) => {
    const store = buildRatePlanStore({ plans });

    const outcome = repository.revokeElitePlanGrant(REVOKE);

    await expect(outcome).rejects.toMatchObject({
      code: "not_granted",
      statusCode: 409,
      message: "This host has no running Elite grant, so there is nothing to revoke.",
    });
    expect(store.plans).toEqual(plans);
    expect(store.events).toEqual([]);
    expect(store.attempts.map(kindsOf)).toEqual([["read"]]);
  });

  it("leaves the grant running when the audit row cannot be written", async () => {
    const failure = new Error("event insert failed");
    const store = buildRatePlanStore({ plans: [RUNNING_GRANT], failEventInsert: failure });

    await expect(repository.revokeElitePlanGrant(REVOKE)).rejects.toBe(failure);

    expect(store.plans).toEqual([RUNNING_GRANT]);
    expect(store.events).toEqual([]);
    expect(store.attempts).toHaveLength(1);
  });

  it("runs the loser of two revokes at the same time again, and it finds nothing left to revoke", async () => {
    const store = buildRatePlanStore({ plans: [RUNNING_GRANT] });
    store.holdCommitsUntil(2);

    const [first, second] = await Promise.allSettled([
      repository.revokeElitePlanGrant(REVOKE),
      repository.revokeElitePlanGrant({ ...REVOKE, actorId: "admin-2" }),
    ]);

    expect(first.status).toBe("fulfilled");
    expect(second.reason).toMatchObject({ code: "not_granted" });
    expect(store.attempts.map(kindsOf)).toEqual([
      ["read", "update", "insert", "insert"],
      ["read", "update", "insert", "insert"],
      ["read"],
    ]);
    expect(currentRowsOf(store)).toEqual([first.value.plan]);
    expect(payloadsOf(store)).toEqual([expect.objectContaining({ actorId: "admin-1", planId: "plan-grant" })]);
  });

  it("revokes the new grant when a grant commits first", async () => {
    const store = buildRatePlanStore({ plans: [RUNNING_GRANT] });
    store.holdCommitsUntil(2);

    const [grant, revoke] = await Promise.all([
      repository.grantElitePlan(GRANT),
      repository.revokeElitePlanGrant(REVOKE),
    ]);

    expect(store.attempts).toHaveLength(3);
    expect(revoke.revokedPlan.id).toBe(grant.plan.id);
    expect(currentRowsOf(store)).toEqual([revoke.plan]);
    expect(payloadsOf(store)).toEqual([
      expect.objectContaining({ type: WEBSITE_PLAN_GRANTED_EVENT, actorId: "admin-2" }),
      expect.objectContaining({ type: WEBSITE_PLAN_GRANT_REVOKED_EVENT, actorId: "admin-1", planId: grant.plan.id }),
    ]);
  });

  it("lets a grant that commits after the revoke start over from Essentials", async () => {
    const store = buildRatePlanStore({ plans: [RUNNING_GRANT] });
    store.holdCommitsUntil(2);

    const [revoke, grant] = await Promise.all([
      repository.revokeElitePlanGrant(REVOKE),
      repository.grantElitePlan(GRANT),
    ]);

    expect(store.attempts).toHaveLength(3);
    expect(grant.replacedPlans).toEqual([revoke.plan]);
    expect(currentRowsOf(store)).toEqual([grant.plan]);
    expect(payloadsOf(store)).toEqual([
      expect.objectContaining({ type: WEBSITE_PLAN_GRANT_REVOKED_EVENT, planId: "plan-grant" }),
      expect.objectContaining({ type: WEBSITE_PLAN_GRANTED_EVENT, replacedPlanIds: [revoke.plan.id] }),
    ]);
  });

  it("refuses on the retry when a paid plan is activated at the same time", async () => {
    const store = buildRatePlanStore({ plans: [RUNNING_GRANT] });
    store.holdCommitsUntil(2);
    const paid = {
      accountId: "host-1",
      plan: "elite",
      priceCents: 4300,
      currency: "EUR",
      billingFrequency: "monthly",
      status: "ACTIVE",
      effectiveFrom: DB_NOW,
      stripeSubscriptionId: "sub_1",
    };

    const [activation, revoke] = await Promise.allSettled([
      repository.activatePaidPlan(paid),
      repository.revokeElitePlanGrant(REVOKE),
    ]);

    expect(activation.status).toBe("fulfilled");
    expect(revoke.reason).toMatchObject({ code: "paid_plan_active" });
    expect(store.attempts).toHaveLength(3);
    expect(currentRowsOf(store)).toEqual([expect.objectContaining({ stripe_subscription_id: "sub_1" })]);
    expect(store.events).toEqual([]);
  });

  it("answers conflict when every commit conflicts, and leaves the grant running", async () => {
    const failure = conflictError();
    const store = buildRatePlanStore({ plans: [RUNNING_GRANT], commitFailures: [failure, failure, failure] });

    const outcome = repository.revokeElitePlanGrant(REVOKE);

    await expect(outcome).rejects.toBeInstanceOf(WebsitePlanRevokeError);
    await expect(outcome).rejects.toMatchObject({ code: "conflict", statusCode: 409, cause: failure });
    expect(store.attempts).toHaveLength(3);
    expect(store.plans).toEqual([RUNNING_GRANT]);
    expect(store.events).toEqual([]);
  });

  it("answers conflict without a retry when the Essentials row is a unique violation", async () => {
    const failure = uniqueViolation();
    const store = buildRatePlanStore({ plans: [RUNNING_GRANT], failPlanInsert: failure });

    await expect(repository.revokeElitePlanGrant(REVOKE)).rejects.toMatchObject({ code: "conflict", cause: failure });

    expect(store.attempts).toHaveLength(1);
    expect(store.plans).toEqual([RUNNING_GRANT]);
  });
});
