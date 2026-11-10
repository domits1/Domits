import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import Stripe from "stripe";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { buildRatePlanStore, conflictError, planRow } from "./support/ratePlanStore.js";

jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

jest.mock("stripe", () => {
  const client = {
    checkout: { sessions: { create: jest.fn() } },
    subscriptions: { retrieve: jest.fn(), update: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
  };
  const StripeClient = jest.fn(() => client);
  StripeClient.client = client;
  return { __esModule: true, default: StripeClient };
});

const CHECKOUT_ON = Object.freeze({
  DIRECT_BOOKING_WEBSITE_CHECKOUT_ENABLED: "true",
  STRIPE_WEBHOOK_SECRET: "webhook-secret-for-tests",
  STRIPE_SECRET_KEY: "stripe-secret-for-tests",
  DIRECT_BOOKING_WEBSITE_ELITE_PRICE_CENTS: "4300",
  DIRECT_BOOKING_WEBSITE_ELITE_PRICE_ID: "price_elite",
  DIRECT_BOOKING_WEBSITE_STRIPE_SUCCESS_URL: "https://example.test/plans",
  DIRECT_BOOKING_WEBSITE_STRIPE_CANCEL_URL: "https://example.test/plans",
});
const PERIOD_END = 1893456000;
const SELF_SELECT_VARIABLE = "DIRECT_BOOKING_WEBSITE_ELITE_SELF_SELECT_ACCOUNT_IDS";
const CURRENT_STATUSES = new Set(["ACTIVE", "PAST_DUE", "TRIALING"]);

const hostUser = (username) => ({
  Username: username,
  UserAttributes: [
    { Name: "custom:group", Value: "Host" },
    { Name: "email", Value: `${username}@example.test` },
  ],
});
const USERS_BY_TOKEN = { "token-host-1": hostUser("host-1"), "token-host-2": hostUser("host-2") };

const stripeMethods = () => [
  Stripe.client.checkout.sessions.create,
  Stripe.client.subscriptions.retrieve,
  Stripe.client.subscriptions.update,
  Stripe.client.webhooks.constructEvent,
];

const expectNoStripeCall = () => {
  expect(Stripe).not.toHaveBeenCalled();
  stripeMethods().forEach((method) => expect(method).not.toHaveBeenCalled());
};

const buildController = () => {
  const controller = new PropertyController();
  controller.authManager.cognitoRepository = {
    getUserByAccessToken: jest.fn(async (token) => {
      if (USERS_BY_TOKEN[token]) return USERS_BY_TOKEN[token];
      throw Object.assign(new Error("Invalid Access Token"), { name: "NotAuthorizedException" });
    }),
  };
  return controller;
};

const patchPlan = async (token, body) => {
  const response = await buildController().changeWebsiteRatePlan({
    httpMethod: "PATCH",
    headers: { Authorization: token },
    body: JSON.stringify(body),
  });
  return { statusCode: response.statusCode, body: JSON.parse(response.body) };
};

const getPlan = async (token) => {
  const response = await buildController().getWebsiteRatePlan({ httpMethod: "GET", headers: { Authorization: token } });
  return { statusCode: response.statusCode, body: JSON.parse(response.body) };
};

const currentRowsOf = (store, accountId) =>
  store.plans.filter((row) => row.account_id === accountId && CURRENT_STATUSES.has(row.status));

const OTHER_HOST_PLAN = planRow({ id: "plan-other-host", account_id: "host-2" });
const UNPAID_ELITE = planRow({ id: "plan-unpaid-elite", plan: "elite" });
const PAID_ELITE = planRow({
  id: "plan-paid-elite",
  plan: "elite",
  price_cents: 4300,
  stripe_customer_id: "cus_1",
  stripe_subscription_id: "sub_1",
});

describe("website plan change on the real call path", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    [...Object.keys(CHECKOUT_ON), SELF_SELECT_VARIABLE].forEach((name) => delete process.env[name]);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    Stripe.client.checkout.sessions.create.mockResolvedValue({ id: "cs_1", url: "https://checkout.example.test/cs_1" });
    Stripe.client.subscriptions.update.mockResolvedValue({ items: { data: [{ current_period_end: PERIOD_END }] } });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("as today", () => {
    it("refuses Elite with 503 while checkout is off, and writes nothing and calls no Stripe", async () => {
      const store = buildRatePlanStore({ plans: [planRow(), OTHER_HOST_PLAN] });

      const response = await patchPlan("token-host-1", { plan: "elite" });

      expect(response).toEqual({
        statusCode: 503,
        body: "Elite checkout is disabled until the rate-plan database migration and Stripe webhook are configured.",
      });
      expect(store.plans).toEqual([planRow(), OTHER_HOST_PLAN]);
      expectNoStripeCall();
    });

    it("opens a Stripe checkout for the account in the token while checkout is on, and writes no plan", async () => {
      Object.assign(process.env, CHECKOUT_ON);
      const store = buildRatePlanStore({ plans: [planRow(), OTHER_HOST_PLAN] });

      const response = await patchPlan("token-host-1", { plan: "elite", accountId: "host-2" });

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({
        action: "checkout_required",
        checkoutUrl: "https://checkout.example.test/cs_1",
        plan: { accountId: "host-1", plan: "essentials" },
      });
      expect(Stripe.client.checkout.sessions.create).toHaveBeenCalledTimes(1);
      expect(Stripe.client.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ client_reference_id: "host-1", metadata: { accountId: "host-1", plan: "elite" } })
      );
      expect(store.plans).toEqual([planRow(), OTHER_HOST_PLAN]);
      expect(store.transactions).toHaveLength(0);
    });

    it("ends an Elite without a subscription and starts Essentials, without Stripe", async () => {
      const store = buildRatePlanStore({ plans: [UNPAID_ELITE, OTHER_HOST_PLAN] });

      const response = await patchPlan("token-host-1", { plan: "essentials" });

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({ action: "downgraded", plan: { accountId: "host-1", plan: "essentials" } });
      expect(store.plans[0]).toMatchObject({ id: "plan-unpaid-elite", status: "EXPIRED", effective_until: expect.any(Date) });
      expect(currentRowsOf(store, "host-1")).toEqual([expect.objectContaining({ plan: "essentials", price_cents: 0 })]);
      expect(store.plans[1]).toEqual(OTHER_HOST_PLAN);
      expectNoStripeCall();
    });

    it("schedules the end of a paid Elite through Stripe", async () => {
      process.env.STRIPE_SECRET_KEY = CHECKOUT_ON.STRIPE_SECRET_KEY;
      const store = buildRatePlanStore({ plans: [PAID_ELITE] });

      const response = await patchPlan("token-host-1", { plan: "essentials" });

      expect(response.body).toMatchObject({ action: "downgrade_scheduled", plan: { plan: "elite" } });
      expect(Stripe.client.subscriptions.update).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: true });
      expect(store.plans).toEqual([
        { ...PAID_ELITE, effective_until: new Date(PERIOD_END * 1000), updated_at: expect.any(Date) },
      ]);
    });

    it("answers the plan of the account in the token", async () => {
      buildRatePlanStore({ plans: [planRow(), OTHER_HOST_PLAN] });

      const response = await getPlan("token-host-1");

      expect(response).toEqual({
        statusCode: 200,
        body: {
          id: "plan-essentials",
          accountId: "host-1",
          plan: "essentials",
          price: 0,
          priceCents: 0,
          elitePriceCents: null,
          checkoutEnabled: false,
          currency: "EUR",
          billingFrequency: "monthly",
          status: "ACTIVE",
          effectiveFrom: "2026-10-01T00:00:00.000Z",
          effectiveUntil: null,
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          entitlements: ["website.basic", "website.booking", "website.basic_customization", "website.basic_seo"],
          eliteSelfSelectAvailable: false,
        },
      });
      expectNoStripeCall();
    });
  });

  describe("plan change with self-select on", () => {
    beforeEach(() => {
      process.env[SELF_SELECT_VARIABLE] = "host-1";
    });

    it.each([
      ["on", CHECKOUT_ON],
      ["off", {}],
    ])("starts Elite without any Stripe call while checkout is %s", async (label, checkoutEnv) => {
      Object.assign(process.env, checkoutEnv);
      const store = buildRatePlanStore({ plans: [planRow(), OTHER_HOST_PLAN] });

      const response = await patchPlan("token-host-1", { plan: "elite", accountId: "host-2" });

      expect(response.statusCode).toBe(200);
      expect(response.body).toMatchObject({
        action: "upgraded",
        plan: { accountId: "host-1", plan: "elite", price: 0, stripeSubscriptionId: null, eliteSelfSelectAvailable: true },
      });
      expect(response.body.plan.entitlements).toContain("website.unlimited_pages");
      expectNoStripeCall();
      expect(store.plans[0]).toMatchObject({ id: "plan-essentials", status: "EXPIRED" });
      expect(store.plans[1]).toEqual(OTHER_HOST_PLAN);
      expect(currentRowsOf(store, "host-1")).toEqual([
        expect.objectContaining({ plan: "elite", price_cents: 0, stripe_subscription_id: null, effective_until: null }),
      ]);
    });

    it("switches back to Essentials in one transaction, ending the Elite features, without Stripe", async () => {
      Object.assign(process.env, CHECKOUT_ON);
      const store = buildRatePlanStore({ plans: [UNPAID_ELITE, OTHER_HOST_PLAN] });

      const response = await patchPlan("token-host-1", { plan: "essentials" });

      expect(response.body).toMatchObject({ action: "downgraded", plan: { plan: "essentials", eliteSelfSelectAvailable: true } });
      expect(response.body.plan.entitlements).not.toContain("website.unlimited_pages");
      expect(store.transactions).toHaveLength(1);
      expect(store.plans[0]).toMatchObject({ id: "plan-unpaid-elite", status: "EXPIRED" });
      expect(currentRowsOf(store, "host-1")).toEqual([expect.objectContaining({ plan: "essentials" })]);
      expect((await getPlan("token-host-1")).body.plan).toBe("essentials");
      expectNoStripeCall();
    });

    it("writes nothing when the listed host chooses the plan he is on", async () => {
      const store = buildRatePlanStore({ plans: [UNPAID_ELITE] });

      const response = await patchPlan("token-host-1", { plan: "elite" });

      expect(response.body).toMatchObject({ action: "unchanged", plan: { id: "plan-unpaid-elite" } });
      expect(store.transactions).toHaveLength(0);
      expect(store.plans).toEqual([UNPAID_ELITE]);
    });

    it("keeps the Stripe paths of a paid Elite as today", async () => {
      process.env[SELF_SELECT_VARIABLE] = "*";
      process.env.STRIPE_SECRET_KEY = CHECKOUT_ON.STRIPE_SECRET_KEY;
      const scheduled = { ...PAID_ELITE, effective_until: new Date(PERIOD_END * 1000) };
      const store = buildRatePlanStore({ plans: [PAID_ELITE] });

      expect((await patchPlan("token-host-1", { plan: "essentials" })).body.action).toBe("downgrade_scheduled");
      expect(Stripe.client.subscriptions.update).toHaveBeenLastCalledWith("sub_1", { cancel_at_period_end: true });
      expect(store.plans).toEqual([{ ...scheduled, updated_at: expect.any(Date) }]);

      expect((await patchPlan("token-host-1", { plan: "elite" })).body.action).toBe("upgrade_restored");
      expect(Stripe.client.subscriptions.update).toHaveBeenLastCalledWith("sub_1", { cancel_at_period_end: false });
      expect(store.plans).toEqual([{ ...PAID_ELITE, updated_at: expect.any(Date) }]);
      expect(store.transactions).toHaveLength(0);
    });

    it("refuses with 409 when a paid plan starts between the read and the change", async () => {
      const store = buildRatePlanStore({ plans: [planRow()] });
      store.beforeNextTransaction = (plans) => {
        plans[0] = { ...plans[0], status: "EXPIRED", effective_until: new Date() };
        plans.push(PAID_ELITE);
      };

      const response = await patchPlan("token-host-1", { plan: "elite" });

      expect(response).toEqual({
        statusCode: 409,
        body: "This website plan has a paid subscription, so it cannot be changed without payment.",
      });
      expect(currentRowsOf(store, "host-1")).toEqual([PAID_ELITE]);
      expectNoStripeCall();
    });

    it("gives a host who is not listed today's answer, and leaves the listed host's plan alone", async () => {
      const store = buildRatePlanStore({ plans: [planRow(), OTHER_HOST_PLAN] });

      const response = await patchPlan("token-host-2", { plan: "elite", accountId: "host-1" });

      expect(response.statusCode).toBe(503);
      expect(store.plans).toEqual([planRow(), OTHER_HOST_PLAN]);
      expect(store.transactions).toHaveLength(0);
    });

    it("gives one current plan when Elite is chosen twice at the same time", async () => {
      const store = buildRatePlanStore({ plans: [planRow()] });
      store.holdCommitsUntil(2);

      const responses = await Promise.all([
        patchPlan("token-host-1", { plan: "elite" }),
        patchPlan("token-host-1", { plan: "elite" }),
      ]);

      expect(responses.map((response) => response.statusCode)).toEqual([200, 200]);
      expect(responses.map((response) => response.body.action).sort()).toEqual(["unchanged", "upgraded"]);
      expect(currentRowsOf(store, "host-1")).toEqual([expect.objectContaining({ plan: "elite" })]);
      expectNoStripeCall();
    });

    it("answers 409 when the change keeps conflicting, and changes nothing", async () => {
      const store = buildRatePlanStore({
        plans: [planRow()],
        commitFailures: [conflictError(), conflictError(), conflictError()],
      });

      const response = await patchPlan("token-host-1", { plan: "elite" });

      expect(response).toEqual({
        statusCode: 409,
        body: "The website plan changed at the same time. Reload the page and try again.",
      });
      expect(store.plans).toEqual([planRow()]);
    });

    it("answers 500 and keeps the current plan when the new plan cannot be written", async () => {
      const store = buildRatePlanStore({ plans: [planRow()], failInsert: new Error("insert failed") });

      const response = await patchPlan("token-host-1", { plan: "elite" });

      expect(response.statusCode).toBe(500);
      expect(store.plans).toEqual([planRow()]);
      expectNoStripeCall();
    });
  });

  describe("withoutPayment that is not a boolean", () => {
    it.each(["true", 1, 0, null, {}, []])("answers 400 to %p and writes nothing, without Stripe", async (withoutPayment) => {
      Object.assign(process.env, CHECKOUT_ON, { [SELF_SELECT_VARIABLE]: "*" });
      const store = buildRatePlanStore({ plans: [] });

      const response = await patchPlan("token-host-1", { plan: "elite", withoutPayment });

      expect(response).toEqual({ statusCode: 400, body: "withoutPayment must be true or false." });
      expect(store.plans).toEqual([]);
      expectNoStripeCall();
    });
  });

  describe("plan answer with self-select", () => {
    it("says self-select is available only to a listed account without a subscription", async () => {
      process.env[SELF_SELECT_VARIABLE] = "host-1";
      buildRatePlanStore({ plans: [planRow(), OTHER_HOST_PLAN] });

      expect((await getPlan("token-host-1")).body.eliteSelfSelectAvailable).toBe(true);
      expect((await getPlan("token-host-2")).body.eliteSelfSelectAvailable).toBe(false);
    });

    it("says self-select is not available to a listed account with a paid Elite", async () => {
      process.env[SELF_SELECT_VARIABLE] = "*";
      buildRatePlanStore({ plans: [PAID_ELITE] });

      const response = await getPlan("token-host-1");

      expect(response.body).toMatchObject({ plan: "elite", stripeSubscriptionId: "sub_1", eliteSelfSelectAvailable: false });
      expectNoStripeCall();
    });
  });
});
