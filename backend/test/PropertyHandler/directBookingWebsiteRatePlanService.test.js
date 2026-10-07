import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  DirectBookingWebsiteRatePlanService,
  getConfiguredElitePriceCents,
  getWebsiteEntitlements,
  hasWebsiteEntitlement,
} from "../../functions/PropertyHandler/business/service/directBookingWebsiteRatePlanService.js";

const plan = (overrides = {}) => ({
  id: "plan-1",
  account_id: "host-1",
  plan: "essentials",
  price_cents: 0,
  currency: "EUR",
  billing_frequency: "monthly",
  status: "ACTIVE",
  effective_from: new Date("2026-10-06T08:00:00.000Z"),
  effective_until: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  ...overrides,
});

describe("DirectBookingWebsiteRatePlanService", () => {
  let repository;
  let stripeRepository;
  let service;

  beforeEach(() => {
    repository = {
      findCurrentByAccountId: jest.fn(),
      findLatestByAccountId: jest.fn(),
      createPlan: jest.fn(),
      updatePlanById: jest.fn(),
      findByStripeSubscriptionId: jest.fn(),
      activatePaidPlan: jest.fn(),
      expireSubscriptionAndCreateEssentials: jest.fn(),
    };
    stripeRepository = {
      createEliteCheckoutSession: jest.fn(),
      cancelSubscriptionAtPeriodEnd: jest.fn(),
      resumeSubscription: jest.fn(),
      constructWebhookEvent: jest.fn(),
      getSubscription: jest.fn(),
    };
    service = new DirectBookingWebsiteRatePlanService(repository, stripeRepository);
  });

  afterEach(() => {
    delete process.env.DIRECT_BOOKING_WEBSITE_ELITE_PRICE_CENTS;
    delete process.env.DIRECT_BOOKING_WEBSITE_ELITE_PRICE_ID;
    delete process.env.DIRECT_BOOKING_WEBSITE_STRIPE_SUCCESS_URL;
    delete process.env.DIRECT_BOOKING_WEBSITE_STRIPE_CANCEL_URL;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("defines pricing and the entitlement boundary", () => {
    process.env.DIRECT_BOOKING_WEBSITE_ELITE_PRICE_CENTS = "4300";
    expect(getConfiguredElitePriceCents()).toBe(4300);
    expect(getWebsiteEntitlements("essentials")).toEqual([
      "website.basic",
      "website.booking",
      "website.basic_customization",
      "website.basic_seo",
    ]);
    expect(hasWebsiteEntitlement("essentials", "website.custom_domain")).toBe(false);
    expect(hasWebsiteEntitlement("elite", "website.custom_domain")).toBe(true);
    expect(hasWebsiteEntitlement("elite", "website.ai")).toBe(true);
  });

  it("provisions Essentials for a new host", async () => {
    repository.findCurrentByAccountId.mockResolvedValue(null);
    repository.findLatestByAccountId.mockResolvedValue(null);
    repository.createPlan.mockResolvedValue(plan());

    await expect(service.getCurrentPlan("host-1")).resolves.toMatchObject({
      plan: "essentials",
      price: 0,
      currency: "EUR",
      billingFrequency: "monthly",
    });
    expect(repository.createPlan).toHaveBeenCalledWith(expect.objectContaining({
      account_id: "host-1", plan: "essentials", price_cents: 0, status: "ACTIVE"
    }));
  });

  it("blocks Elite-only entitlements for Essentials", async () => {
    repository.findCurrentByAccountId.mockResolvedValue(plan());
    await expect(service.requireEntitlement("host-1", "website.custom_domain"))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it("allows Elite-only entitlements for Elite", async () => {
    repository.findCurrentByAccountId.mockResolvedValue(plan({
      plan: "elite", price_cents: 4300, stripe_subscription_id: "sub_1"
    }));
    await expect(service.requireEntitlement("host-1", "website.custom_domain"))
      .resolves.toMatchObject({ plan: "elite" });
  });

  it("starts Elite checkout without granting Elite first", async () => {
    repository.findCurrentByAccountId.mockResolvedValue(plan());
    stripeRepository.createEliteCheckoutSession.mockResolvedValue({
      id: "cs_1", url: "https://checkout.stripe.com/cs_test"
    });
    process.env.DIRECT_BOOKING_WEBSITE_ELITE_PRICE_ID = "price_elite";
    process.env.DIRECT_BOOKING_WEBSITE_STRIPE_SUCCESS_URL = "https://example.com/success";
    process.env.DIRECT_BOOKING_WEBSITE_STRIPE_CANCEL_URL = "https://example.com/cancel";

    await expect(service.changePlan({
      accountId: "host-1", targetPlan: "elite", customerEmail: "host@example.com"
    })).resolves.toMatchObject({
      action: "checkout_required",
      plan: { plan: "essentials" },
      checkoutSessionId: "cs_1",
    });

    expect(repository.updatePlanById).not.toHaveBeenCalled();
  });

  it("activates Elite after a paid checkout webhook", async () => {
    repository.findByStripeSubscriptionId.mockResolvedValue(null);
    stripeRepository.constructWebhookEvent.mockResolvedValue({
      type: "checkout.session.completed",
      data: { object: {
        mode: "subscription",
        payment_status: "paid",
        metadata: { accountId: "host-1" },
        subscription: "sub_1",
        customer: "cus_1",
      }},
    });
    stripeRepository.getSubscription.mockResolvedValue({
      id: "sub_1", customer: "cus_1", status: "active",
      items: { data: [{ current_period_start: 1791283200, current_period_end: 1793961600 }] },
    });
    repository.activatePaidPlan.mockResolvedValue(plan({
      plan: "elite", price_cents: 4300, stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1"
    }));

    await expect(service.handleStripeWebhook("raw", "sig")).resolves.toEqual({ handled: true });
    expect(repository.activatePaidPlan).toHaveBeenCalledWith(expect.objectContaining({
      accountId: "host-1", plan: "elite", priceCents: 4300,
      stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1", status: "ACTIVE"
    }));
  });

  it("does not set an end date on a new Elite row when the subscription renews normally", async () => {
    repository.findByStripeSubscriptionId.mockResolvedValue(null);
    repository.activatePaidPlan.mockResolvedValue(plan({
      plan: "elite",
      price_cents: 4300,
      stripe_subscription_id: "sub_renewing",
    }));

    await service.activateEliteFromSubscription("host-1", {
      id: "sub_renewing",
      customer: "cus_1",
      status: "active",
      cancel_at_period_end: false,
      items: { data: [{ current_period_start: 1791283200, current_period_end: 1793961600 }] },
    });

    expect(repository.activatePaidPlan).toHaveBeenCalledWith(expect.objectContaining({
      effectiveUntil: null,
    }));
  });

  it("sets the Elite end date when Stripe has scheduled cancellation", async () => {
    repository.findByStripeSubscriptionId.mockResolvedValue(null);
    repository.activatePaidPlan.mockResolvedValue(plan({
      plan: "elite",
      price_cents: 4300,
      stripe_subscription_id: "sub_canceling",
    }));

    await service.activateEliteFromSubscription("host-1", {
      id: "sub_canceling",
      customer: "cus_1",
      status: "active",
      cancel_at_period_end: true,
      items: { data: [{ current_period_start: 1791283200, current_period_end: 1793961600 }] },
    });

    expect(repository.activatePaidPlan).toHaveBeenCalledWith(expect.objectContaining({
      effectiveUntil: new Date(1793961600 * 1000),
    }));
  });

  it("handles repeated subscription events idempotently", async () => {
    const current = plan({
      plan: "elite", price_cents: 4300, stripe_subscription_id: "sub_1"
    });
    repository.findByStripeSubscriptionId.mockResolvedValue(current);
    repository.updatePlanById.mockResolvedValue(current);

    await expect(service.activateEliteFromSubscription("host-1", {
      id: "sub_1", customer: "cus_1", status: "active",
      items: { data: [{ current_period_start: 1791283200, current_period_end: 1793961600 }] },
    })).resolves.toBe(current);

    expect(repository.activatePaidPlan).not.toHaveBeenCalled();
    expect(repository.updatePlanById).toHaveBeenCalledWith("plan-1", expect.objectContaining({
      status: "ACTIVE", effective_until: null, stripe_customer_id: "cus_1"
    }));
  });

  it("schedules Elite downgrade for the paid period end", async () => {
    const current = plan({
      plan: "elite", price_cents: 4300, stripe_subscription_id: "sub_1"
    });
    repository.findCurrentByAccountId.mockResolvedValue(current);
    stripeRepository.cancelSubscriptionAtPeriodEnd.mockResolvedValue({
      items: { data: [{ current_period_end: 1793961600 }] },
    });
    repository.updatePlanById.mockResolvedValue({
      ...current, effective_until: new Date(1793961600 * 1000)
    });

    await expect(service.changePlan({ accountId: "host-1", targetPlan: "essentials" }))
      .resolves.toMatchObject({
        action: "downgrade_scheduled",
        plan: { plan: "elite", effectiveUntil: new Date(1793961600 * 1000) }
      });
    expect(stripeRepository.cancelSubscriptionAtPeriodEnd).toHaveBeenCalledWith("sub_1");
  });

  it("restores an Elite subscription before the paid period ends", async () => {
    const current = plan({
      plan: "elite", price_cents: 4300, stripe_subscription_id: "sub_1",
      effective_until: new Date("2026-11-01T00:00:00.000Z")
    });
    repository.findCurrentByAccountId.mockResolvedValue(current);
    repository.updatePlanById.mockResolvedValue({ ...current, effective_until: null });

    await expect(service.changePlan({ accountId: "host-1", targetPlan: "elite" }))
      .resolves.toMatchObject({ action: "upgrade_restored" });
    expect(stripeRepository.resumeSubscription).toHaveBeenCalledWith("sub_1");
    expect(repository.updatePlanById).toHaveBeenCalledWith("plan-1", { effective_until: null });
  });

  it("marks Elite past due after a failed invoice", async () => {
    const current = plan({ plan: "elite", stripe_subscription_id: "sub_1" });
    repository.findByStripeSubscriptionId.mockResolvedValue(current);
    stripeRepository.constructWebhookEvent.mockResolvedValue({
      type: "invoice.payment_failed",
      data: { object: { subscription: "sub_1" } },
    });

    await expect(service.handleStripeWebhook("raw", "sig")).resolves.toEqual({ handled: true });
    expect(repository.updatePlanById).toHaveBeenCalledWith("plan-1", { status: "PAST_DUE" });
  });

  it("returns Essentials after Elite is deleted", async () => {
    stripeRepository.constructWebhookEvent.mockResolvedValue({
      type: "customer.subscription.deleted",
      data: { object: { id: "sub_1" } },
    });
    repository.expireSubscriptionAndCreateEssentials.mockResolvedValue(plan());

    await expect(service.handleStripeWebhook("raw", "sig")).resolves.toEqual({ handled: true });
    expect(repository.expireSubscriptionAndCreateEssentials).toHaveBeenCalledWith(
      "sub_1", expect.any(Date)
    );
  });

  it("rejects unsupported plans", async () => {
    await expect(service.changePlan({
      accountId: "host-1", targetPlan: "enterprise"
    })).rejects.toMatchObject({
      statusCode: 400,
      message: "Unsupported direct booking website plan.",
    });
  });
});
