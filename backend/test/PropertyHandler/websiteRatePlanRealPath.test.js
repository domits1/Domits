import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import Stripe from "stripe";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { buildRatePlanStore, planRow } from "./support/ratePlanStore.js";

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
    Object.keys(CHECKOUT_ON).forEach((name) => delete process.env[name]);
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
        },
      });
      expectNoStripeCall();
    });
  });
});
