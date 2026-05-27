import Stripe from "stripe";
import { calculateRefundAmountCents } from "../../functions/General-Bookings-CRUD-Bookings-develop/util/refundCalculator.js";

const BOOKING_AMOUNT_CENTS = 10000;
const REFUND_REASON = "requested_by_customer";
const skipIntegrationTests = !process.env.RUN_STRIPE_INTEGRATION_TESTS;

const refundScenarios = [
  ["Flexible - Cancel 12h before = 0% refund", "flexible", 12, 0],
  ["Flexible - Cancel 25h before = 100% refund", "flexible", 25, BOOKING_AMOUNT_CENTS],
  ["Moderate - Cancel 3d before = 50% refund", "moderate", 72, 5000],
  ["Moderate - Cancel 6d before = 100% refund", "moderate", 144, BOOKING_AMOUNT_CENTS],
  ["Limited - Cancel 6d before = 0% refund", "limited", 144, 0],
  ["Limited - Cancel 10d before = 50% refund", "limited", 240, 5000],
  ["Limited - Cancel 15d before = 100% refund", "limited", 360, BOOKING_AMOUNT_CENTS],
  ["Firm - Cancel 6d before = 0% refund", "firm", 144, 0],
  ["Firm - Cancel 25d before = 50% refund", "firm", 600, 5000],
  ["Firm - Cancel 35d before = 100% refund", "firm", 840, BOOKING_AMOUNT_CENTS],
];

(skipIntegrationTests ? describe.skip : describe)("Stripe Refund Integration - Manual Test", () => {
  let stripe;
  const testPaymentIntents = [];

  beforeAll(() => {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  });

  afterAll(async () => {
    if (testPaymentIntents.length === 0) {
      return;
    }

    console.log("\nTest Payment Intents Created:");
    testPaymentIntents.forEach((pi) => {
      console.log(`  - ${pi.id}: EUR ${(pi.amount / 100).toFixed(2)} - Status: ${pi.status}`);
    });
  });

  const createTestPaymentIntent = async (amountCents, description) => {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "eur",
      description,
      automatic_payment_methods: { enabled: true },
    });

    expect(paymentIntent.currency).toBe("eur");
    testPaymentIntents.push(paymentIntent);
    return paymentIntent;
  };

  const createRefund = async (paymentIntentId, amountCents) =>
    stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amountCents,
      reason: REFUND_REASON,
    });

  it.each(refundScenarios)("Scenario %# - %s", async (name, policy, hoursBeforeArrival, expectedRefundCents) => {
    const paymentIntent = await createTestPaymentIntent(BOOKING_AMOUNT_CENTS, `Test: ${name}`);
    const now = new Date();
    const arrivalDate = new Date(now.getTime() + hoursBeforeArrival * 60 * 60 * 1000);
    const refundAmountCents = calculateRefundAmountCents(policy, arrivalDate, BOOKING_AMOUNT_CENTS, now);

    expect(refundAmountCents).toBe(expectedRefundCents);

    if (refundAmountCents === 0) {
      console.log(`OK ${name}: Payment Intent ${paymentIntent.id} - Expected refund: EUR 0.00`);
      return;
    }

    if (paymentIntent.status === "succeeded") {
      const refund = await createRefund(paymentIntent.id, refundAmountCents);
      expect(refund.status).toBe("succeeded");
      console.log(`OK ${name}: Refund ${refund.id} - Amount: EUR ${(refundAmountCents / 100).toFixed(2)}`);
    }
  });

  it("Error Handling: Should fail gracefully on invalid payment intent", async () => {
    await expect(createRefund("pi_invalid_123456", 5000)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("Error Handling: Should fail when refund exceeds payment amount", async () => {
    const paymentIntent = await createTestPaymentIntent(5000, "Test: Over-refund");

    await expect(createRefund(paymentIntent.id, 10000)).rejects.toMatchObject({ statusCode: 400 });
  });
});
