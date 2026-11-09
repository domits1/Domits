import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  DirectBookingWebsiteRatePlanRepository,
  WEBSITE_PLAN_GRANTED_EVENT,
} from "../../functions/PropertyHandler/data/repository/directBookingWebsiteRatePlanRepository.js";
import { WebsitePlanGrantError } from "../../functions/PropertyHandler/util/exception/WebsitePlanGrantError.js";
import { DB_NOW, buildRatePlanStore, conflictError, uniqueViolation } from "./support/ratePlanGrantStore.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const LAMBDA_NOW = 1_800_000_000_000;
const GRANT = Object.freeze({
  accountId: "host-1",
  effectiveUntil: new Date("2027-05-01T00:00:00.000Z"),
  actorId: "admin-1",
  reason: "Pilot host for the Elite website",
});

const planRow = (overrides = {}) => ({
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

const RUNNING_GRANT = planRow({ id: "plan-grant", plan: "elite", effective_until: new Date("2027-01-01T00:00:00.000Z") });
const CURRENT_STATUSES = new Set(["ACTIVE", "PAST_DUE", "TRIALING"]);
const currentRowsOf = (store) => store.plans.filter((row) => CURRENT_STATUSES.has(row.status));
const kindsOf = (operations) => operations.map((operation) => operation.kind);

describe("DirectBookingWebsiteRatePlanRepository.grantElitePlan", () => {
  let repository;

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(LAMBDA_NOW);
    repository = new DirectBookingWebsiteRatePlanRepository();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("replaces the current plan with the grant and writes the audit row in the same transaction", async () => {
    const otherHost = planRow({ id: "plan-other", account_id: "host-2", plan: "elite", stripe_subscription_id: "sub_2" });
    const history = planRow({ id: "plan-history", status: "CANCELLED" });
    const store = buildRatePlanStore({ plans: [planRow(), otherHost, history] });

    const result = await repository.grantElitePlan(GRANT);

    expect(store.attempts).toHaveLength(1);
    const [expired, untouchedHost, untouchedHistory, granted] = store.plans;
    expect(untouchedHost).toEqual(otherHost);
    expect(untouchedHistory).toEqual(history);
    expect(expired).toMatchObject({ id: "plan-essentials", status: "EXPIRED", effective_until: DB_NOW, updated_at: DB_NOW });
    expect(granted).toMatchObject({
      account_id: "host-1",
      plan: "elite",
      price_cents: 0,
      status: "ACTIVE",
      effective_from: DB_NOW,
      effective_until: GRANT.effectiveUntil,
      stripe_customer_id: null,
      stripe_subscription_id: null,
    });
    expect(currentRowsOf(store)).toEqual([otherHost, granted]);
    expect(result.plan).toEqual(granted);
    expect(result.replacedPlans).toEqual([planRow()]);
    expect(store.events).toHaveLength(1);
    expect(store.events[0]).toMatchObject({
      draft_id: null,
      property_id: null,
      host_id: "host-1",
      event_type: WEBSITE_PLAN_GRANTED_EVENT,
      occurred_at: LAMBDA_NOW,
    });
    expect(JSON.parse(store.events[0].payload_json)).toEqual({
      actorId: "admin-1",
      planId: granted.id,
      replacedPlanIds: ["plan-essentials"],
      effectiveUntil: "2027-05-01T00:00:00.000Z",
      reason: "Pilot host for the Elite website",
    });
  });

  it.each(["ACTIVE", "PAST_DUE", "TRIALING"])(
    "refuses a host whose %s plan has a subscription and changes nothing",
    async (status) => {
      const paid = planRow({ id: "plan-paid", plan: "elite", price_cents: 4300, status, stripe_subscription_id: "sub_1" });
      const store = buildRatePlanStore({ plans: [paid] });

      const outcome = repository.grantElitePlan(GRANT);

      await expect(outcome).rejects.toBeInstanceOf(WebsitePlanGrantError);
      await expect(outcome).rejects.toMatchObject({ code: "paid_plan_active", statusCode: 409 });
      expect(store.plans).toEqual([paid]);
      expect(store.events).toEqual([]);
      expect(store.attempts.map(kindsOf)).toEqual([["read"]]);
    }
  );

  it("leaves the plans untouched when the audit row cannot be written", async () => {
    const failure = new Error("event insert failed");
    const store = buildRatePlanStore({ plans: [planRow()], failEventInsert: failure });

    await expect(repository.grantElitePlan(GRANT)).rejects.toBe(failure);

    expect(store.plans).toEqual([planRow()]);
    expect(store.events).toEqual([]);
    expect(store.attempts).toHaveLength(1);
  });

  it("ends a running grant at the database clock when the host is granted again", async () => {
    const store = buildRatePlanStore({ plans: [RUNNING_GRANT] });

    const result = await repository.grantElitePlan(GRANT);

    expect(store.plans[0]).toMatchObject({ id: "plan-grant", status: "EXPIRED", effective_until: DB_NOW });
    expect(currentRowsOf(store)).toEqual([result.plan]);
    expect(result.replacedPlans).toEqual([RUNNING_GRANT]);
  });

  it("keeps the end date of a current-status row that already ended", async () => {
    const ended = new Date("2026-10-31T00:00:00.000Z");
    const store = buildRatePlanStore({ plans: [{ ...RUNNING_GRANT, effective_until: ended }] });

    await repository.grantElitePlan(GRANT);

    expect(store.plans[0]).toMatchObject({ status: "EXPIRED", effective_until: ended });
  });

  it("inserts the grant without an update for a host without a plan row", async () => {
    const store = buildRatePlanStore();

    const result = await repository.grantElitePlan(GRANT);

    expect(store.attempts.map(kindsOf)).toEqual([["read", "insert", "insert"]]);
    expect(currentRowsOf(store)).toEqual([result.plan]);
    expect(JSON.parse(store.events[0].payload_json).replacedPlanIds).toEqual([]);
  });

  it.each([
    ["a current plan", [planRow()]],
    ["no plan row", []],
  ])("runs the loser of two grants at the same time again, for a host with %s", async (_label, plans) => {
    const store = buildRatePlanStore({ plans });
    store.holdCommitsUntil(2);
    const later = { ...GRANT, actorId: "admin-2", effectiveUntil: new Date("2027-08-01T00:00:00.000Z") };

    const [first, second] = await Promise.all([repository.grantElitePlan(GRANT), repository.grantElitePlan(later)]);

    expect(store.attempts).toHaveLength(3);
    expect(currentRowsOf(store)).toEqual([second.plan]);
    expect(second.plan.effective_until).toEqual(later.effectiveUntil);
    expect(second.replacedPlans.map((plan) => plan.id)).toEqual([first.plan.id]);
    expect(store.plans.find((row) => row.id === first.plan.id)).toMatchObject({ status: "EXPIRED" });
    expect(store.events.map((event) => JSON.parse(event.payload_json).actorId)).toEqual(["admin-1", "admin-2"]);
  });

  it("refuses on the retry when a paid plan is activated at the same time", async () => {
    const store = buildRatePlanStore({ plans: [planRow()] });
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

    const [activation, grant] = await Promise.allSettled([
      repository.activatePaidPlan(paid),
      repository.grantElitePlan(GRANT),
    ]);

    expect(activation.status).toBe("fulfilled");
    expect(grant.reason).toMatchObject({ code: "paid_plan_active" });
    expect(store.attempts).toHaveLength(3);
    expect(currentRowsOf(store)).toEqual([expect.objectContaining({ stripe_subscription_id: "sub_1" })]);
    expect(store.events).toEqual([]);
  });

  it("answers conflict to the loser when the database reports the race as a unique violation", async () => {
    const store = buildRatePlanStore({ commitUniqueError: uniqueViolation() });
    store.holdCommitsUntil(2);

    const [first, second] = await Promise.allSettled([
      repository.grantElitePlan(GRANT),
      repository.grantElitePlan({ ...GRANT, actorId: "admin-2" }),
    ]);

    expect(second.reason).toMatchObject({ code: "conflict", statusCode: 409 });
    expect(currentRowsOf(store)).toEqual([first.value.plan]);
    expect(store.events).toHaveLength(1);
    expect(store.attempts).toHaveLength(2);
  });

  it.each([
    ["40001", { code: "40001" }],
    ["OC001", { code: "OC001" }],
    ["a driver 40001", { driverError: { code: "40001" } }],
  ])("answers conflict when every commit fails with %s and leaves nothing behind", async (_label, shape) => {
    const failure = conflictError(shape);
    const store = buildRatePlanStore({ plans: [planRow()], commitFailures: [failure, failure, failure] });

    const outcome = repository.grantElitePlan(GRANT);

    await expect(outcome).rejects.toMatchObject({ code: "conflict", statusCode: 409, cause: failure });
    expect(store.attempts).toHaveLength(3);
    expect(store.plans).toEqual([planRow()]);
    expect(store.events).toEqual([]);
  });

  it.each([
    ["the error", uniqueViolation()],
    ["the driver error", Object.assign(new Error("duplicate key"), { driverError: { code: "23505" } })],
  ])("answers conflict without a retry when %s is a unique violation", async (_label, failure) => {
    const store = buildRatePlanStore({ plans: [planRow()], failPlanInsert: failure });

    await expect(repository.grantElitePlan(GRANT)).rejects.toMatchObject({ code: "conflict", cause: failure });

    expect(store.attempts).toHaveLength(1);
    expect(store.plans).toEqual([planRow()]);
  });

  it("passes any other failure through unchanged", async () => {
    const failure = Object.assign(new Error("relation does not exist"), { code: "42P01" });
    const store = buildRatePlanStore({ plans: [planRow()], failPlanInsert: failure });

    await expect(repository.grantElitePlan(GRANT)).rejects.toBe(failure);

    expect(store.attempts).toHaveLength(1);
  });
});
