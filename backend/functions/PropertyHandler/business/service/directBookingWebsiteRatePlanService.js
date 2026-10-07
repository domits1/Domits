import { DirectBookingWebsiteRatePlanRepository } from "../../data/repository/directBookingWebsiteRatePlanRepository.js";
import { DirectBookingWebsiteStripeRepository } from "../../data/repository/directBookingWebsiteStripeRepository.js";

export const WEBSITE_PLAN_NAMES = Object.freeze({
  ESSENTIALS: "essentials",
  ELITE: "elite",
});

export const WEBSITE_PLAN_ENTITLEMENTS = Object.freeze({
  essentials: Object.freeze([
    "website.basic",
    "website.booking",
    "website.basic_customization",
    "website.basic_seo",
  ]),
  elite: Object.freeze([
    "website.basic",
    "website.booking",
    "website.basic_customization",
    "website.basic_seo",
    "website.custom_domain",
    "website.advanced_builder",
    "website.unlimited_pages",
    "website.multi_property",
    "website.multilingual",
    "website.multi_currency",
    "website.advanced_seo",
    "website.analytics",
    "website.crm",
    "website.ai",
    "website.upsells",
    "website.experiments",
  ]),
});

const ACTIVE_PLAN_STATUSES = new Set(["ACTIVE", "PAST_DUE", "TRIALING"]);
const DEFAULT_CURRENCY = "EUR";
const DEFAULT_BILLING_FREQUENCY = "monthly";

export const getConfiguredElitePriceCents = () => {
  const configured = Number(process.env.DIRECT_BOOKING_WEBSITE_ELITE_PRICE_CENTS || 4300);
  return Number.isInteger(configured) && configured > 0 ? configured : 4300;
};

export const getWebsiteEntitlements = (plan) =>
  WEBSITE_PLAN_ENTITLEMENTS[plan] ? [...WEBSITE_PLAN_ENTITLEMENTS[plan]] : [];

export const hasWebsiteEntitlement = (plan, entitlement) =>
  getWebsiteEntitlements(plan).includes(entitlement);

const serviceError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const fromUnix = (value) =>
  Number.isFinite(Number(value)) ? new Date(Number(value) * 1000) : null;

const getSubscriptionPeriodStart = (subscription) =>
  fromUnix(subscription?.items?.data?.[0]?.current_period_start) ||
  fromUnix(subscription?.current_period_start) ||
  fromUnix(subscription?.start_date);

const getSubscriptionPeriodEnd = (subscription) =>
  fromUnix(subscription?.items?.data?.[0]?.current_period_end) ||
  fromUnix(subscription?.current_period_end);

const stripeStatus = (value) => {
  switch (String(value || "").toLowerCase()) {
    case "active": return "ACTIVE";
    case "trialing": return "TRIALING";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired": return "PAST_DUE";
    case "canceled": return "CANCELLED";
    default: return "PAST_DUE";
  }
};

const toView = (plan) => ({
  id: plan.id,
  accountId: plan.account_id,
  plan: plan.plan,
  price: Number(plan.price_cents || 0) / 100,
  priceCents: Number(plan.price_cents || 0),
  currency: plan.currency || DEFAULT_CURRENCY,
  billingFrequency: plan.billing_frequency || DEFAULT_BILLING_FREQUENCY,
  status: plan.status,
  effectiveFrom: plan.effective_from,
  effectiveUntil: plan.effective_until,
  stripeCustomerId: plan.stripe_customer_id || null,
  stripeSubscriptionId: plan.stripe_subscription_id || null,
  entitlements: getWebsiteEntitlements(plan.plan),
});

export class DirectBookingWebsiteRatePlanService {
  constructor(
    repository = new DirectBookingWebsiteRatePlanRepository(),
    stripeRepository = new DirectBookingWebsiteStripeRepository()
  ) {
    this.repository = repository;
    this.stripeRepository = stripeRepository;
  }

  async getCurrentPlan(accountId) {
    if (!accountId) throw serviceError("accountId is required.");

    const current = await this.repository.findCurrentByAccountId(accountId);
    if (current) return toView(current);

    const latest = await this.repository.findLatestByAccountId(accountId);
    if (
      latest &&
      ACTIVE_PLAN_STATUSES.has(latest.status) &&
      latest.effective_until &&
      new Date(latest.effective_until).getTime() <= Date.now()
    ) {
      await this.repository.updatePlanById(latest.id, { status: "EXPIRED" });
    }

    try {
      const created = await this.repository.createPlan({
        account_id: accountId,
        plan: WEBSITE_PLAN_NAMES.ESSENTIALS,
        price_cents: 0,
        currency: DEFAULT_CURRENCY,
        billing_frequency: DEFAULT_BILLING_FREQUENCY,
        status: "ACTIVE",
        effective_from: new Date(),
        effective_until: null,
      });
      return toView(created);
    } catch (error) {
      if (String(error?.code || "") === "23505") {
        const racedCurrent = await this.repository.findCurrentByAccountId(accountId);
        if (racedCurrent) return toView(racedCurrent);
      }
      throw error;
    }
  }

  async requireEntitlement(accountId, entitlement) {
    const current = await this.getCurrentPlan(accountId);
    if (hasWebsiteEntitlement(current.plan, entitlement)) return current;
    throw serviceError(
      `Your current direct booking website plan does not include "${entitlement}".`,
      403
    );
  }

  async changePlan({ accountId, targetPlan, customerEmail }) {
    if (!accountId) throw serviceError("accountId is required.");
    if (!Object.values(WEBSITE_PLAN_NAMES).includes(targetPlan)) {
      throw serviceError("Unsupported direct booking website plan.");
    }

    const current = await this.getCurrentPlan(accountId);

    if (current.plan === targetPlan) {
      if (targetPlan === WEBSITE_PLAN_NAMES.ELITE && current.effectiveUntil && current.stripeSubscriptionId) {
        await this.stripeRepository.resumeSubscription(current.stripeSubscriptionId);
        const updated = await this.repository.updatePlanById(current.id, { effective_until: null });
        return { action: "upgrade_restored", plan: toView(updated) };
      }
      return { action: "unchanged", plan: current };
    }

    if (targetPlan === WEBSITE_PLAN_NAMES.ELITE) {
      const session = await this.stripeRepository.createEliteCheckoutSession({
        accountId,
        email: customerEmail,
        priceId: String(process.env.DIRECT_BOOKING_WEBSITE_ELITE_PRICE_ID || "").trim(),
        successUrl: String(process.env.DIRECT_BOOKING_WEBSITE_STRIPE_SUCCESS_URL || "").trim(),
        cancelUrl: String(process.env.DIRECT_BOOKING_WEBSITE_STRIPE_CANCEL_URL || "").trim(),
      });
      return {
        action: "checkout_required",
        plan: current,
        checkoutUrl: session.url,
        checkoutSessionId: session.id,
      };
    }

    if (current.stripeSubscriptionId) {
      const subscription = await this.stripeRepository.cancelSubscriptionAtPeriodEnd(current.stripeSubscriptionId);
      const effectiveUntil = getSubscriptionPeriodEnd(subscription);
      if (!effectiveUntil) {
        throw serviceError("Stripe did not return a billing period end date for the current subscription.", 502);
      }
      const updated = await this.repository.updatePlanById(current.id, {
        effective_until: effectiveUntil,
      });
      return { action: "downgrade_scheduled", plan: toView(updated) };
    }

    const now = new Date();
    await this.repository.updatePlanById(current.id, {
      status: "EXPIRED",
      effective_until: now,
    });
    const essentials = await this.repository.createPlan({
      account_id: accountId,
      plan: WEBSITE_PLAN_NAMES.ESSENTIALS,
      price_cents: 0,
      currency: current.currency || DEFAULT_CURRENCY,
      billing_frequency: current.billingFrequency || DEFAULT_BILLING_FREQUENCY,
      status: "ACTIVE",
      effective_from: now,
      effective_until: null,
      stripe_customer_id: current.stripeCustomerId,
      stripe_subscription_id: null,
    });
    return { action: "downgraded", plan: toView(essentials) };
  }

  async handleStripeWebhook(rawBody, signature) {
    const event = await this.stripeRepository.constructWebhookEvent(
      rawBody,
      signature,
      String(process.env.STRIPE_WEBHOOK_SECRET || "").trim()
    );
    const object = event?.data?.object;

    switch (event.type) {
      case "checkout.session.completed": {
        const paid = object?.payment_status === "paid" || object?.payment_status === "no_payment_required";
        if (object?.mode !== "subscription" || !paid) return { handled: true };

        const accountId = object?.metadata?.accountId;
        const subscriptionId = String(object?.subscription || "");
        const customerId = object?.customer ? String(object.customer) : null;
        if (!accountId || !subscriptionId) {
          throw serviceError("Stripe checkout session is missing account metadata.");
        }

        const subscription = await this.stripeRepository.getSubscription(subscriptionId);
        await this.activateEliteFromSubscription(accountId, subscription, customerId);
        return { handled: true };
      }

      case "customer.subscription.updated": {
        const accountId = object?.metadata?.accountId;
        if (accountId) {
          const existing = await this.repository.findByStripeSubscriptionId(object.id);
          const effectiveUntil = getSubscriptionPeriodEnd(object);
          if (existing) {
            await this.repository.updatePlanById(existing.id, {
              status: stripeStatus(object.status),
              effective_until: object.cancel_at_period_end ? effectiveUntil : null,
            });
          } else {
            await this.activateEliteFromSubscription(accountId, object);
          }
        }
        return { handled: true };
      }

      case "invoice.payment_failed": {
        const subscriptionId = String(
          object?.parent?.subscription_details?.subscription || ""
        );
        const existing = await this.repository.findByStripeSubscriptionId(subscriptionId);
        if (existing) await this.repository.updatePlanById(existing.id, { status: "PAST_DUE" });
        return { handled: true };
      }

      case "customer.subscription.deleted":
        await this.repository.expireSubscriptionAndCreateEssentials(String(object?.id || ""), new Date());
        return { handled: true };

      default:
        return { handled: false };
    }
  }

  async activateEliteFromSubscription(accountId, subscription, stripeCustomerId = null) {
    if (!accountId || !subscription?.id) {
      throw serviceError("Stripe subscription is missing required plan data.");
    }

    const status = stripeStatus(subscription.status);
    const effectiveFrom = getSubscriptionPeriodStart(subscription) || new Date();
    const effectiveUntil = subscription.cancel_at_period_end
      ? getSubscriptionPeriodEnd(subscription)
      : null;
    const subscriptionId = String(subscription.id);
    const customerId = stripeCustomerId || (subscription.customer ? String(subscription.customer) : null);

    const existing = await this.repository.findByStripeSubscriptionId(subscriptionId);
    if (existing) {
      return this.repository.updatePlanById(existing.id, {
        status,
        effective_until: subscription.cancel_at_period_end ? effectiveUntil : null,
        stripe_customer_id: customerId,
      });
    }

    if (status === "CANCELLED") {
      return this.repository.expireSubscriptionAndCreateEssentials(subscriptionId, effectiveFrom);
    }

    try {
      return await this.repository.activatePaidPlan({
        accountId,
        plan: WEBSITE_PLAN_NAMES.ELITE,
        priceCents: getConfiguredElitePriceCents(),
        currency: DEFAULT_CURRENCY,
        billingFrequency: DEFAULT_BILLING_FREQUENCY,
        status,
        effectiveFrom,
        effectiveUntil,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
      });
    } catch (error) {
      if (String(error?.code || "") === "23505") {
        const raced = await this.repository.findByStripeSubscriptionId(subscriptionId);
        if (raced) return raced;
      }
      throw error;
    }
  }
}
