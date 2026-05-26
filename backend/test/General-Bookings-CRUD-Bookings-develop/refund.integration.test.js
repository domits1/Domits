import Stripe from "stripe";
import { calculateRefundAmountCents } from "../../functions/General-Bookings-CRUD-Bookings-develop/util/refundCalculator.js";

const skipIntegrationTests = !process.env.RUN_STRIPE_INTEGRATION_TESTS;

(skipIntegrationTests ? describe.skip : describe)("Stripe Refund Integration - Manual Test", () => {
  let stripe;
  let testPaymentIntents = [];

  beforeAll(() => {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  });

  afterAll(async () => {
    if (testPaymentIntents.length > 0) {
      console.log("\nTest Payment Intents Created:");
      testPaymentIntents.forEach((pi) => {
        console.log(`  - ${pi.id}: €${(pi.amount / 100).toFixed(2)} - Status: ${pi.status}`);
      });
    }
  });

  /**
   * Helper: Create a test payment intent
   * In test mode, use test card 4242 4242 4242 4242
   */
  const createTestPaymentIntent = async (amountCents, description) => {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "eur",
      description: description,
      automatic_payment_methods: { enabled: true },
    });

    expect(paymentIntent.currency).toBe("eur");

    testPaymentIntents.push(paymentIntent);
    return paymentIntent;
  };

  /**
   * Scenario 1: Flexible Policy - 12 hours before (0% refund)
   */
  it("Scenario 1: Flexible - Cancel 12h before = 0% refund", async () => {
    const bookingAmount = 10000; // €100
    const pi = await createTestPaymentIntent(bookingAmount, "Test: Flexible 12h");

    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const refundAmountCents = calculateRefundAmountCents("flexible", arrivalDate, bookingAmount, now);

    expect(refundAmountCents).toBe(0);
    console.log(`✓ Scenario 1: Payment Intent ${pi.id} - Expected refund: €0.00`);
  });

  /**
   * Scenario 2: Flexible Policy - 25 hours before (100% refund)
   */
  it("Scenario 2: Flexible - Cancel 25h before = 100% refund", async () => {
    const bookingAmount = 10000; // €100
    const pi = await createTestPaymentIntent(bookingAmount, "Test: Flexible 25h");

    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const refundAmountCents = calculateRefundAmountCents("flexible", arrivalDate, bookingAmount, now);

    expect(refundAmountCents).toBe(bookingAmount);

    // Process refund with Stripe
    if (pi.status === "succeeded") {
      const refund = await stripe.refunds.create({
        payment_intent: pi.id,
        amount: refundAmountCents,
        reason: "requested_by_customer",
      });

      expect(refund.status).toBe("succeeded");
      console.log(`✓ Scenario 2: Refund ${refund.id} - Amount: €${(refundAmountCents / 100).toFixed(2)}`);
    }
  });

  /**
   * Scenario 3: Moderate Policy - 3 days before (50% refund)
   */
  it("Scenario 3: Moderate - Cancel 3d before = 50% refund", async () => {
    const bookingAmount = 10000; // €100
    const pi = await createTestPaymentIntent(bookingAmount, "Test: Moderate 3d");

    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 3 days

    const refundAmountCents = calculateRefundAmountCents("moderate", arrivalDate, bookingAmount, now);

    expect(refundAmountCents).toBe(5000); // 50% of €100

    if (pi.status === "succeeded") {
      const refund = await stripe.refunds.create({
        payment_intent: pi.id,
        amount: refundAmountCents,
        reason: "requested_by_customer",
      });

      expect(refund.status).toBe("succeeded");
      console.log(`✓ Scenario 3: Refund ${refund.id} - Amount: €${(refundAmountCents / 100).toFixed(2)}`);
    }
  });

  /**
   * Scenario 4: Moderate Policy - 6 days before (100% refund)
   */
  it("Scenario 4: Moderate - Cancel 6d before = 100% refund", async () => {
    const bookingAmount = 10000; // €100
    const pi = await createTestPaymentIntent(bookingAmount, "Test: Moderate 6d");

    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 144 * 60 * 60 * 1000); // 6 days

    const refundAmountCents = calculateRefundAmountCents("moderate", arrivalDate, bookingAmount, now);

    expect(refundAmountCents).toBe(bookingAmount);

    if (pi.status === "succeeded") {
      const refund = await stripe.refunds.create({
        payment_intent: pi.id,
        amount: refundAmountCents,
        reason: "requested_by_customer",
      });

      expect(refund.status).toBe("succeeded");
      console.log(`✓ Scenario 4: Refund ${refund.id} - Amount: €${(refundAmountCents / 100).toFixed(2)}`);
    }
  });

  /**
   * Scenario 5: Limited Policy - 6 days before (0% refund)
   */
  it("Scenario 5: Limited - Cancel 6d before = 0% refund", async () => {
    const bookingAmount = 10000; // €100
    const pi = await createTestPaymentIntent(bookingAmount, "Test: Limited 6d");

    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 144 * 60 * 60 * 1000); // 6 days

    const refundAmountCents = calculateRefundAmountCents("limited", arrivalDate, bookingAmount, now);

    expect(refundAmountCents).toBe(0);
    console.log(`✓ Scenario 5: Payment Intent ${pi.id} - Expected refund: €0.00`);
  });

  /**
   * Scenario 6: Limited Policy - 10 days before (50% refund)
   */
  it("Scenario 6: Limited - Cancel 10d before = 50% refund", async () => {
    const bookingAmount = 10000; // €100
    const pi = await createTestPaymentIntent(bookingAmount, "Test: Limited 10d");

    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 240 * 60 * 60 * 1000); // 10 days

    const refundAmountCents = calculateRefundAmountCents("limited", arrivalDate, bookingAmount, now);

    expect(refundAmountCents).toBe(5000); // 50% of €100

    if (pi.status === "succeeded") {
      const refund = await stripe.refunds.create({
        payment_intent: pi.id,
        amount: refundAmountCents,
        reason: "requested_by_customer",
      });

      expect(refund.status).toBe("succeeded");
      console.log(`✓ Scenario 6: Refund ${refund.id} - Amount: €${(refundAmountCents / 100).toFixed(2)}`);
    }
  });

  /**
   * Scenario 7: Limited Policy - 15 days before (100% refund)
   */
  it("Scenario 7: Limited - Cancel 15d before = 100% refund", async () => {
    const bookingAmount = 10000; // €100
    const pi = await createTestPaymentIntent(bookingAmount, "Test: Limited 15d");

    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 360 * 60 * 60 * 1000); // 15 days

    const refundAmountCents = calculateRefundAmountCents("limited", arrivalDate, bookingAmount, now);

    expect(refundAmountCents).toBe(bookingAmount);

    if (pi.status === "succeeded") {
      const refund = await stripe.refunds.create({
        payment_intent: pi.id,
        amount: refundAmountCents,
        reason: "requested_by_customer",
      });

      expect(refund.status).toBe("succeeded");
      console.log(`✓ Scenario 7: Refund ${refund.id} - Amount: €${(refundAmountCents / 100).toFixed(2)}`);
    }
  });

  /**
   * Scenario 8: Firm Policy - 6 days before (0% refund)
   */
  it("Scenario 8: Firm - Cancel 6d before = 0% refund", async () => {
    const bookingAmount = 10000; // €100
    const pi = await createTestPaymentIntent(bookingAmount, "Test: Firm 6d");

    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 144 * 60 * 60 * 1000); // 6 days

    const refundAmountCents = calculateRefundAmountCents("firm", arrivalDate, bookingAmount, now);

    expect(refundAmountCents).toBe(0);
    console.log(`✓ Scenario 8: Payment Intent ${pi.id} - Expected refund: €0.00`);
  });

  /**
   * Scenario 9: Firm Policy - 25 days before (50% refund)
   */
  it("Scenario 9: Firm - Cancel 25d before = 50% refund", async () => {
    const bookingAmount = 10000; // €100
    const pi = await createTestPaymentIntent(bookingAmount, "Test: Firm 25d");

    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 600 * 60 * 60 * 1000); // 25 days

    const refundAmountCents = calculateRefundAmountCents("firm", arrivalDate, bookingAmount, now);

    expect(refundAmountCents).toBe(5000); // 50% of €100

    if (pi.status === "succeeded") {
      const refund = await stripe.refunds.create({
        payment_intent: pi.id,
        amount: refundAmountCents,
        reason: "requested_by_customer",
      });

      expect(refund.status).toBe("succeeded");
      console.log(`✓ Scenario 9: Refund ${refund.id} - Amount: €${(refundAmountCents / 100).toFixed(2)}`);
    }
  });

  /**
   * Scenario 10: Firm Policy - 35 days before (100% refund)
   */
  it("Scenario 10: Firm - Cancel 35d before = 100% refund", async () => {
    const bookingAmount = 10000; // €100
    const pi = await createTestPaymentIntent(bookingAmount, "Test: Firm 35d");

    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 840 * 60 * 60 * 1000); // 35 days

    const refundAmountCents = calculateRefundAmountCents("firm", arrivalDate, bookingAmount, now);

    expect(refundAmountCents).toBe(bookingAmount);

    if (pi.status === "succeeded") {
      const refund = await stripe.refunds.create({
        payment_intent: pi.id,
        amount: refundAmountCents,
        reason: "requested_by_customer",
      });

      expect(refund.status).toBe("succeeded");
      console.log(`✓ Scenario 10: Refund ${refund.id} - Amount: €${(refundAmountCents / 100).toFixed(2)}`);
    }
  });

  /**
   * Error Handling: Attempt refund on non-existent payment intent
   */
  it("Error Handling: Should fail gracefully on invalid payment intent", async () => {
    try {
      await stripe.refunds.create({
        payment_intent: "pi_invalid_123456",
        amount: 5000,
        reason: "requested_by_customer",
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.statusCode).toBe(404);
      console.log(`✓ Error Handling: Correctly rejected invalid payment intent - ${error.message}`);
    }
  });

  /**
   * Error Handling: Attempt refund amount greater than original charge
   */
  it("Error Handling: Should fail when refund exceeds payment amount", async () => {
    const bookingAmount = 5000; // €50
    const pi = await createTestPaymentIntent(bookingAmount, "Test: Over-refund");

    try {
      await stripe.refunds.create({
        payment_intent: pi.id,
        amount: 10000, // Try to refund EUR 100 on a EUR 50 charge
        reason: "requested_by_customer",
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.statusCode).toBe(400);
      console.log(`✓ Error Handling: Correctly rejected over-refund - ${error.message}`);
    }
  });
});
