import { describe, expect, it, jest } from "@jest/globals";
import { DirectBookingWebsiteRatePlanRepository } from "../../functions/PropertyHandler/data/repository/directBookingWebsiteRatePlanRepository.js";
import { buildRatePlanStore, conflictError, planRow, uniqueViolation } from "./support/ratePlanStore.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const CURRENT_STATUSES = new Set(["ACTIVE", "PAST_DUE", "TRIALING"]);
const currentRowsOf = (store, accountId) =>
  store.plans.filter((row) => row.account_id === accountId && CURRENT_STATUSES.has(row.status));

const OTHER_HOST_PAID = planRow({
  id: "plan-other-host",
  account_id: "host-2",
  plan: "elite",
  price_cents: 4300,
  stripe_subscription_id: "sub_2",
});
const HISTORY = planRow({ id: "plan-history", plan: "elite", status: "EXPIRED", effective_until: new Date("2026-09-01T00:00:00.000Z") });
const UNPAID_ELITE = planRow({ id: "plan-unpaid-elite", plan: "elite" });
const TO_ELITE = Object.freeze({ accountId: "host-1", targetPlan: "elite" });

const repository = new DirectBookingWebsiteRatePlanRepository();

describe("DirectBookingWebsiteRatePlanRepository.replaceUnpaidPlan", () => {
  it("ends the current plan and starts the target plan without a price in one transaction", async () => {
    const store = buildRatePlanStore({ plans: [planRow({ stripe_customer_id: "cus_old" }), OTHER_HOST_PAID, HISTORY] });

    const result = await repository.replaceUnpaidPlan(TO_ELITE);

    expect(store.transactions).toHaveLength(1);
    const [ended, otherHost, history, started] = store.plans;
    expect(ended).toMatchObject({ id: "plan-essentials", status: "EXPIRED", effective_until: expect.any(Date) });
    expect(otherHost).toEqual(OTHER_HOST_PAID);
    expect(history).toEqual(HISTORY);
    expect(started).toMatchObject({
      account_id: "host-1",
      plan: "elite",
      price_cents: 0,
      status: "ACTIVE",
      effective_until: null,
      stripe_customer_id: "cus_old",
      stripe_subscription_id: null,
    });
    expect(currentRowsOf(store, "host-1")).toEqual([started]);
    expect(result).toEqual({ outcome: "changed", plan: started });
  });

  it("keeps the earlier end date of a row that had already ended", async () => {
    const endedButActive = planRow({ effective_until: new Date("2026-10-20T00:00:00.000Z") });
    const store = buildRatePlanStore({ plans: [endedButActive] });

    await repository.replaceUnpaidPlan(TO_ELITE);

    expect(store.plans[0]).toMatchObject({ status: "EXPIRED", effective_until: endedButActive.effective_until });
  });

  it("starts the plan for a host without a current row", async () => {
    const store = buildRatePlanStore({ plans: [HISTORY] });

    const result = await repository.replaceUnpaidPlan(TO_ELITE);

    expect(result.outcome).toBe("changed");
    expect(store.plans[0]).toEqual(HISTORY);
    expect(currentRowsOf(store, "host-1")).toEqual([expect.objectContaining({ plan: "elite", price_cents: 0 })]);
  });

  it("changes nothing for a host already on the target plan without an end date", async () => {
    const store = buildRatePlanStore({ plans: [UNPAID_ELITE] });

    const result = await repository.replaceUnpaidPlan(TO_ELITE);

    expect(result).toEqual({ outcome: "unchanged", plan: UNPAID_ELITE });
    expect(store.plans).toEqual([UNPAID_ELITE]);
  });

  it("replaces a target plan that has an end date with one that has none", async () => {
    const ending = planRow({ id: "plan-ending-elite", plan: "elite", effective_until: new Date("2027-01-01T00:00:00.000Z") });
    const store = buildRatePlanStore({ plans: [ending] });

    const result = await repository.replaceUnpaidPlan(TO_ELITE);

    expect(result.outcome).toBe("changed");
    expect(store.plans[0]).toMatchObject({ id: "plan-ending-elite", status: "EXPIRED" });
    expect(currentRowsOf(store, "host-1")).toEqual([expect.objectContaining({ plan: "elite", effective_until: null })]);
  });

  it.each(["ACTIVE", "PAST_DUE", "TRIALING"])(
    "refuses a host whose %s plan has a subscription and changes nothing",
    async (status) => {
      const paid = planRow({ id: "plan-paid", plan: "elite", price_cents: 4300, status, stripe_subscription_id: "sub_1" });
      const store = buildRatePlanStore({ plans: [paid] });

      await expect(repository.replaceUnpaidPlan({ accountId: "host-1", targetPlan: "essentials" })).resolves.toEqual({
        outcome: "paid_plan_active",
      });
      expect(store.plans).toEqual([paid]);
    }
  );

  it("does not count an ended paid plan in the history as a paid plan", async () => {
    const endedPaid = planRow({
      id: "plan-ended-paid",
      plan: "elite",
      price_cents: 4300,
      status: "CANCELLED",
      effective_until: new Date("2026-09-01T00:00:00.000Z"),
      stripe_subscription_id: "sub_old",
    });
    const store = buildRatePlanStore({ plans: [endedPaid, planRow()] });

    const result = await repository.replaceUnpaidPlan(TO_ELITE);

    expect(result.outcome).toBe("changed");
    expect(store.plans[0]).toEqual(endedPaid);
  });

  it("leaves the plans untouched when the new plan cannot be written", async () => {
    const failure = new Error("insert failed");
    const store = buildRatePlanStore({ plans: [planRow(), OTHER_HOST_PAID], failInsert: failure });

    await expect(repository.replaceUnpaidPlan(TO_ELITE)).rejects.toBe(failure);

    expect(store.plans).toEqual([planRow(), OTHER_HOST_PAID]);
  });

  it("gives one current plan when two requests replace the same plan at the same time", async () => {
    const store = buildRatePlanStore({ plans: [planRow()] });
    store.holdCommitsUntil(2);

    const results = await Promise.all([repository.replaceUnpaidPlan(TO_ELITE), repository.replaceUnpaidPlan(TO_ELITE)]);

    expect(results.map((result) => result.outcome).sort()).toEqual(["changed", "unchanged"]);
    expect(store.transactions).toHaveLength(3);
    expect(currentRowsOf(store, "host-1")).toEqual([expect.objectContaining({ plan: "elite" })]);
  });

  it("refuses on its retry when a paid activation commits first, and keeps the paid plan", async () => {
    const store = buildRatePlanStore({ plans: [planRow()] });
    store.holdCommitsUntil(2);
    const paid = { accountId: "host-1", plan: "elite", priceCents: 4300, currency: "EUR", billingFrequency: "monthly" };

    const [, result] = await Promise.all([
      repository.activatePaidPlan({ ...paid, status: "ACTIVE", effectiveFrom: new Date(), stripeSubscriptionId: "sub_1" }),
      repository.replaceUnpaidPlan(TO_ELITE),
    ]);

    expect(result).toEqual({ outcome: "paid_plan_active" });
    expect(store.transactions).toHaveLength(3);
    expect(currentRowsOf(store, "host-1")).toEqual([expect.objectContaining({ stripe_subscription_id: "sub_1" })]);
    expect(store.plans).toHaveLength(2);
    const ended = { ...planRow(), status: "EXPIRED", effective_until: expect.any(Date), updated_at: expect.any(Date) };
    expect(store.plans[0]).toEqual(ended);
  });

  it("answers conflict and changes nothing when the conflict outlives the retries", async () => {
    const store = buildRatePlanStore({
      plans: [planRow()],
      commitFailures: [conflictError(), conflictError(), conflictError()],
    });

    await expect(repository.replaceUnpaidPlan(TO_ELITE)).resolves.toEqual({ outcome: "conflict" });

    expect(store.transactions).toHaveLength(3);
    expect(store.plans).toEqual([planRow()]);
  });

  it("answers conflict on a unique violation without running again", async () => {
    const store = buildRatePlanStore({ plans: [planRow()], commitFailures: [uniqueViolation()] });

    await expect(repository.replaceUnpaidPlan(TO_ELITE)).resolves.toEqual({ outcome: "conflict" });

    expect(store.transactions).toHaveLength(1);
    expect(store.plans).toEqual([planRow()]);
  });
});
