#!/usr/bin/env node

import { parseBackfillArgs, runBackfill } from "./lib/backfillCli.js";
import Database from "database";
import { Booking } from "database/models/Booking";
import { parseDecimalToMinorUnits } from "database/money";



const resolveSourceCurrency = (booking) => {
  const bookingType = String(booking.bookingtype || "").trim().toLowerCase();
  if (bookingType === "channex") {
    const storedCurrency = String(booking.currency || "").trim().toUpperCase();
    if (storedCurrency) return storedCurrency;
    return booking.total_price !== null && booking.total_price !== undefined ? "EUR" : null;
  }
  if (bookingType === "inquiry" && booking.booking_source === "STANDALONE_SITE") {
    return String(booking.currency || "EUR").trim().toUpperCase();
  }
  return null;
};


async function backfillBooking(booking, client, commit) {
  const currency = resolveSourceCurrency(booking);
  if (!currency) {
    console.info(`Skipping booking ${booking.id}: source or currency cannot be established safely.`);
    return "skipped";
  }

  let amountMinor;
  try {
    amountMinor = parseDecimalToMinorUnits(String(booking.total_price), currency);
    if (BigInt(amountMinor) < 0n) throw new RangeError("Booking totals cannot be negative.");
  } catch (error) {
    console.error(`Skipping booking ${booking.id}: ${error.message}`);
    return "skipped";
  }

  console.info(`Booking ${booking.id}: ${booking.total_price} ${currency} -> total_price_minor=${amountMinor}`);
  if (!commit) return "skipped";

  try {
    await client.createQueryBuilder().update(Booking).set({ total_price_minor: amountMinor })
      .where("id = :id", { id: booking.id }).andWhere("total_price_minor IS NULL").execute();
    return "updated";
  } catch (error) {
    console.error(`Failed to update booking ${booking.id}:`, error.message || error);
    return "error";
  }
}

async function main() {
  const { commit, limit } = parseBackfillArgs();
  const client = await Database.getInstance();
  let query = client.getRepository(Booking).createQueryBuilder("booking")
    .where("booking.total_price_minor IS NULL").andWhere("booking.total_price IS NOT NULL");

  if (limit) query = query.limit(limit);

  const bookings = await query.getMany();
  let updated = 0, skipped = 0, errors = 0;

  console.info(`Backfill stored booking amounts to integer minor units - commit=${commit} limit=${limit ?? "none"}`);
  console.info(`Found ${bookings.length} rows with a legacy total price and no exact amount.`);

  await bookings.reduce((pending, booking) => pending.then(async () => {
    const result = await backfillBooking(booking, client, commit);
    if (result === "updated") updated++;
    else if (result === "skipped") skipped++;
    else errors++;
  }), Promise.resolve());

  console.info(`Finished. updated=${updated} skipped=${skipped} errors=${errors}`);
}

await runBackfill(main);
