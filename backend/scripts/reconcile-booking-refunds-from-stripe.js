#!/usr/bin/env node

import Database from "database";
import Stripe from "stripe";
import { Booking } from "database/models/Booking";
import { SystemManagerRepository } from "../ORM/data/systemManagerRepository.js";

function parseArgs() {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const limitIndex = args.indexOf("--limit");
  let limit = null;

  if (limitIndex !== -1) {
    const parsed = Number(args[limitIndex + 1]);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw new Error("--limit expects a positive safe integer");
    }
    limit = parsed;
  }

  return { commit, limit };
}

async function fetchStripeSecret() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  const repository = new SystemManagerRepository();
  return repository.getSystemManagerParameter("/stripe/keys/secret/live");
}

const statusForStripe = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "succeeded":
      return "refunded";
    case "failed":
    case "canceled":
      return "not_refunded";
    default:
      return "unknown";
  }
};

async function main() {
  const { commit, limit } = parseArgs();
  const client = await Database.getInstance();
  let query = client
    .getRepository(Booking)
    .createQueryBuilder("booking")
    .where("booking.stripe_refund_id IS NOT NULL")
    .andWhere("LEFT(booking.stripe_refund_id, 3) = 're_'");

  if (limit) query = query.limit(limit);

  const bookings = await query.getMany();
  console.info(`Refund reconciliation dry-run=${!commit} limit=${limit ?? "none"}; found=${bookings.length}`);
  if (bookings.length === 0) return;

  const stripeSecret = await fetchStripeSecret();
  if (!stripeSecret) {
    throw new Error("Stripe secret not found. Set STRIPE_SECRET_KEY or ensure SSM access to /stripe/keys/secret/live.");
  }
  const stripe = new Stripe(stripeSecret);

  let verified = 0;
  let skipped = 0;
  let errors = 0;

  for (const booking of bookings) {
    let refund;
    try {
      refund = await stripe.refunds.retrieve(booking.stripe_refund_id);
    } catch (error) {
      console.error(`Could not retrieve Stripe refund ${booking.stripe_refund_id} for booking ${booking.id}:`, error.message || error);
      errors++;
      continue;
    }

    const expectedCurrency = String(booking.currency || "EUR").trim().toLowerCase();
    if (!refund?.currency || refund.currency.toLowerCase() !== expectedCurrency) {
      console.warn(
        `Skipping booking ${booking.id}: refund currency ${refund?.currency || "unknown"} does not match booking currency ${expectedCurrency}.`
      );
      skipped++;
      continue;
    }

    const refundStatus = statusForStripe(refund.status);
    const changes = { refund_status: refundStatus };
    if (refundStatus === "refunded") {
      if (!Number.isSafeInteger(refund.amount) || refund.amount < 0) {
        console.error(`Skipping booking ${booking.id}: Stripe returned an invalid refund amount.`);
        errors++;
        continue;
      }
      changes.refunded_amount = refund.amount;
    } else if (refundStatus === "not_refunded") {
      changes.refunded_amount = 0;
    }

    console.info(
      `Booking ${booking.id}: Stripe refund ${refund.id} status=${refund.status}; actual amount=${changes.refunded_amount ?? "not confirmed"} ${expectedCurrency.toUpperCase()}`
    );
    if (!commit) {
      skipped++;
      continue;
    }

    try {
      await client
        .createQueryBuilder()
        .update(Booking)
        .set(changes)
        .where("id = :id", { id: booking.id })
        .andWhere("stripe_refund_id = :refundId", { refundId: booking.stripe_refund_id })
        .execute();
      verified++;
    } catch (error) {
      console.error(`Failed to reconcile booking ${booking.id}:`, error.message || error);
      errors++;
    }
  }

  console.info(`Finished. reconciled=${verified} skipped=${skipped} errors=${errors}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
