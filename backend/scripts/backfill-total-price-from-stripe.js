#!/usr/bin/env node

import Database from "database";
import { Booking } from "database/models/Booking";
import { SystemManagerRepository } from "../ORM/data/systemManagerRepository.js";
import Stripe from "stripe";

function parseArgs() {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex !== -1 ? Number(args[limitIndex + 1]) : null;
  if (limit !== null && Number.isNaN(limit)) throw new Error("--limit expects a number");
  return { commit, limit };
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function main() {
  const { commit, limit } = parseArgs();
  console.log(`Backfill total_price from Stripe - commit=${commit} limit=${limit ?? "none"}`);

  let stripeSecret = process.env.STRIPE_SECRET_KEY || null;
  if (!stripeSecret) {
    try {
      const ssm = new SystemManagerRepository();
      stripeSecret = await ssm.getSystemManagerParameter("/stripe/keys/secret/live");
    } catch (err) {
      console.error("Failed to fetch Stripe secret from SSM:", err.message || err);
    }
  }

  if (!stripeSecret) {
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
    try {
      const paymentId = b.paymentid;
      if (!paymentId) {
        skipped++;
        continue;
      }

      let pi;
      try {
        pi = await stripe.paymentIntents.retrieve(paymentId);
      } catch (err) {
        console.error(`Stripe retrieval failed for booking ${b.id} payment ${paymentId}:`, err.message || err);
        errors++;
        continue;
      }

      if (!pi || typeof pi.amount !== "number") {
        console.error(`PaymentIntent missing amount for booking ${b.id} payment ${paymentId}`);
        errors++;
        continue;
      }

      const amountCents = pi.amount;
      const amountEuros = Math.round(amountCents) / 100;

      console.log(
        `Booking ${b.id}: payment=${paymentId} amount=${amountCents} ${pi.currency} -> total_price=${amountEuros}`
      );

      if (commit) {
        await client
          .createQueryBuilder()
          .update(Booking)
          .set({ total_price: amountEuros })
          .where("id = :id", { id: b.id })
          .execute();
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Unexpected error processing booking ${b.id}:`, err.message || err);
      errors++;
    }
  }

  console.log(`Finished. updated=${updated} skipped=${skipped} errors=${errors}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
