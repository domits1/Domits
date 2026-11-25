#!/usr/bin/env node

import { parseBackfillArgs, runBackfill } from "./lib/backfillCli.js";
import Database from "database";
import { Booking } from "database/models/Booking";
import { SystemManagerRepository } from "../ORM/data/systemManagerRepository.js";
import Stripe from "stripe";



async function fetchStripeSecret() {
  const envSecret = process.env.STRIPE_SECRET_KEY;
  if (envSecret) return envSecret;

  try {
    const ssm = new SystemManagerRepository();
    return await ssm.getSystemManagerParameter("/stripe/keys/secret/live");
  } catch (error) {
    console.error("Failed to fetch Stripe secret from SSM:", error.message || error);
    return null;
  }
}

async function processBooking(booking, stripe, client, commit) {
  const paymentId = String(booking.paymentid || "").trim();
  const bookingType = String(booking.bookingtype || "").trim().toLowerCase();
  const currency = String(booking.currency || "EUR").trim().toUpperCase();

  if (bookingType !== "direct" || !/^pi_\w+$/.test(paymentId) || currency !== "EUR") {
    return "skipped";
  }

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
  } catch (error) {
    console.error(`Stripe retrieval failed for booking ${booking.id} payment ${paymentId}:`, error.message || error);
    return "error";
  }

  if (paymentIntent?.currency?.toLowerCase() !== "eur") {
    console.error(`Skipping booking ${booking.id}: PaymentIntent currency is not EUR.`);
    return "skipped";
  }
  if (paymentIntent?.status !== "succeeded") {
    console.info(`Skipping booking ${booking.id}: PaymentIntent status is ${paymentIntent?.status || "unknown"}.`);
    return "skipped";
  }
  if (
    !Number.isSafeInteger(paymentIntent.amount) ||
    paymentIntent.amount < 0 ||
    !Number.isSafeInteger(paymentIntent.amount_received) ||
    paymentIntent.amount_received !== paymentIntent.amount
  ) {
    console.warn(
      `Skipping booking ${booking.id}: PaymentIntent amount and amount_received are not the same safe integer value.`
    );
    return "skipped";
  }

  const amountMinor = paymentIntent.amount;
  const amountMajor = amountMinor / 100;
  const legacyAmountMinor =
    booking.total_price === null || booking.total_price === undefined ? null : Math.round(Number(booking.total_price) * 100);
  if (legacyAmountMinor !== null && legacyAmountMinor !== 0 && legacyAmountMinor !== amountMinor) {
    console.warn(
      `Skipping booking ${booking.id}: stored total_price (${legacyAmountMinor}) does not match the Stripe PaymentIntent amount (${amountMinor}).`
    );
    return "skipped";
  }

  console.info(
    `Booking ${booking.id}: payment=${paymentId} PaymentIntent amount=${amountMinor} EUR cents -> total_price_minor=${amountMinor}`
  );

  if (commit !== true) return "skipped";

  try {
    await client
      .createQueryBuilder()
      .update(Booking)
      .set({
        total_price_minor: String(amountMinor),
        ...(booking.total_price === null || booking.total_price === undefined || Number(booking.total_price) === 0
          ? { total_price: amountMajor }
          : {}),
      })
      .where("id = :id", { id: booking.id })
      .andWhere("paymentid = :paymentId", { paymentId })
      .andWhere("total_price_minor IS NULL")
      .execute();
    return "updated";
  } catch (error) {
    console.error(`Failed to update booking ${booking.id}:`, error.message || error);
    return "error";
  }
}

async function main() {
  const { commit, limit } = parseBackfillArgs();
  console.info(`Backfill direct EUR booking totals from successful Stripe PaymentIntents - commit=${commit} limit=${limit ?? "none"}`);

  const client = await Database.getInstance();
  let query = client
    .getRepository(Booking)
    .createQueryBuilder("booking")
    .where("LOWER(COALESCE(booking.bookingtype, '')) = :bookingType", { bookingType: "direct" })
    .andWhere("LEFT(booking.paymentid, 3) = 'pi_'")
    .andWhere("COALESCE(NULLIF(UPPER(booking.currency), ''), 'EUR') = 'EUR'")
    .andWhere("booking.total_price_minor IS NULL");

  if (limit) query = query.limit(limit);

  const bookings = await query.getMany();
  console.info(`Found ${bookings.length} eligible direct bookings to inspect.`);
  if (bookings.length === 0) return;

  const stripeSecret = await fetchStripeSecret();
  if (stripeSecret == null) {
    throw new Error("Stripe secret not found. Set STRIPE_SECRET_KEY or ensure SSM access to /stripe/keys/secret/live.");
  }

  const stripe = new Stripe(stripeSecret);
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  await bookings.reduce((pending, booking) => pending.then(async () => {
    const result = await processBooking(booking, stripe, client, commit);
    if (result === "updated") updated++;
    else if (result === "skipped") skipped++;
    else errors++;
  }), Promise.resolve());

  console.info(`Finished. updated=${updated} skipped=${skipped} errors=${errors}`);
}

await runBackfill(main);
