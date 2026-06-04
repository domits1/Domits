#!/usr/bin/env node

import Database from "database";
import { Booking } from "database/models/Booking";
import { SystemManagerRepository } from "../ORM/data/systemManagerRepository.js";
import Stripe from "stripe";

function parseArgs() {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const limitIndex = args.indexOf("--limit");
  let limit = null;

  if (limitIndex === -1) {
    limit = null;
  } else {
    const parsed = Number(args[limitIndex + 1]);
    if (Number.isNaN(parsed)) throw new Error("--limit expects a number");
    limit = parsed;
  }

  return { commit, limit };
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function fetchStripeSecret() {
  const envSecret = process.env.STRIPE_SECRET_KEY;
  if (envSecret) return envSecret;

  try {
    const ssm = new SystemManagerRepository();
    return await ssm.getSystemManagerParameter("/stripe/keys/secret/live");
  } catch (err) {
    console.error("Failed to fetch Stripe secret from SSM:", err.message || err);
    return null;
  }
}

async function processBooking(booking, stripe, client, commit) {
  const paymentId = booking.paymentid;
  if (paymentId == null || paymentId === "") return "skipped";

  let pi;
  try {
    pi = await stripe.paymentIntents.retrieve(paymentId);
  } catch (err) {
    console.error(`Stripe retrieval failed for booking ${booking.id} payment ${paymentId}:`, err.message || err);
    return "error";
  }

  if (pi == null || typeof pi.amount !== "number") {
    console.error(`PaymentIntent missing amount for booking ${booking.id} payment ${paymentId}`);
    return "error";
  }

  const amountCents = pi.amount;
  const amountEuros = Math.round(amountCents) / 100;

  console.log(
    `Booking ${booking.id}: payment=${paymentId} amount=${amountCents} ${pi.currency} -> total_price=${amountEuros}`
  );

  if (commit !== true) return "skipped";

  try {
    await client
      .createQueryBuilder()
      .update(Booking)
      .set({ total_price: amountEuros })
      .where("id = :id", { id: booking.id })
      .execute();
    return "updated";
  } catch (err) {
    console.error(`Failed to update booking ${booking.id}:`, err.message || err);
    return "error";
  }
}

async function main() {
  const { commit, limit } = parseArgs();
  console.log(`Backfill total_price from Stripe - commit=${commit} limit=${limit ?? "none"}`);

  const stripeSecret = await fetchStripeSecret();
  if (stripeSecret == null) {
    console.error("Stripe secret not found. Set STRIPE_SECRET_KEY or ensure SSM access to /stripe/keys/secret/live.");
    process.exit(2);
  }

  const stripe = new Stripe(stripeSecret);
  const client = await Database.getInstance();

  let query = client
    .getRepository(Booking)
    .createQueryBuilder("booking")
    .where("booking.paymentid IS NOT NULL")
    .andWhere("(booking.total_price IS NULL OR booking.total_price = 0)");

  if (limit) query = query.limit(limit);

  const bookings = await query.getMany();
  console.log(`Found ${bookings.length} bookings to inspect.`);
  if (bookings.length === 0) process.exit(0);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const b of bookings) {
    const result = await processBooking(b, stripe, client, commit);
    if (result === "updated") updated++;
    else if (result === "skipped") skipped++;
    else if (result === "error") errors++;
  }

  console.log(`Finished. updated=${updated} skipped=${skipped} errors=${errors}`);
}

try {
  await main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
