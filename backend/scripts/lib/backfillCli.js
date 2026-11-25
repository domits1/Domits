import { Booking } from "database/models/Booking";

export function parseBackfillArgs() {
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

export async function updateBookingMinorUnits(client, booking, changes, paymentId = null) {
  try {
    let query = client.createQueryBuilder().update(Booking).set(changes)
      .where("id = :id", { id: booking.id }).andWhere("total_price_minor IS NULL");
    if (paymentId) query = query.andWhere("paymentid = :paymentId", { paymentId });
    await query.execute();
    return "updated";
  } catch (error) {
    console.error(`Failed to update booking ${booking.id}:`, error.message || error);
    return "error";
  }
}

export async function runBackfill(main) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
