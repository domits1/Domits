import Stripe from "stripe";

export class DirectBookingWebsiteStripeRepository {
  stripe = null;

  getStripeClient() {
    if (!this.stripe) {
      const secret = String(process.env.STRIPE_SECRET_KEY || "").trim();
      if (!secret) {
        const error = new Error("STRIPE_SECRET_KEY is not configured.");
        error.statusCode = 500;
        throw error;
      }
      this.stripe = new Stripe(secret);
    }
    return this.stripe;
  }

  async createEliteCheckoutSession({ accountId, email, priceId, successUrl, cancelUrl }) {
    if (!priceId || !successUrl || !cancelUrl) {
      const error = new Error(
        "DIRECT_BOOKING_WEBSITE_ELITE_PRICE_ID, DIRECT_BOOKING_WEBSITE_STRIPE_SUCCESS_URL and DIRECT_BOOKING_WEBSITE_STRIPE_CANCEL_URL must be configured."
      );
      error.statusCode = 500;
      throw error;
    }

    return this.getStripeClient().checkout.sessions.create({
      mode: "subscription",
      customer_email: email || undefined,
      client_reference_id: accountId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { accountId, plan: "elite" },
      subscription_data: { metadata: { accountId, plan: "elite" } },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async getSubscription(subscriptionId) {
    return this.getStripeClient().subscriptions.retrieve(subscriptionId);
  }

  async cancelSubscriptionAtPeriodEnd(subscriptionId) {
    return this.getStripeClient().subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  }

  async resumeSubscription(subscriptionId) {
    return this.getStripeClient().subscriptions.update(subscriptionId, { cancel_at_period_end: false });
  }

  async constructWebhookEvent(payload, signature, secret) {
    if (!secret) {
      const error = new Error("STRIPE_WEBHOOK_SECRET is not configured.");
      error.statusCode = 500;
      throw error;
    }
    return this.getStripeClient().webhooks.constructEvent(payload, signature, secret);
  }
}
