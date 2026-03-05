import { randomUUID } from "crypto";
import Database from "database";
import { Channel_Reservation } from "database/models/Channel_Reservation";
import { Channel_Guest } from "database/models/Channel_Guest";
import { Channel_Financial_Transaction } from "database/models/Channel_Financial_Transaction";
import { Channel_Cancellation } from "database/models/Channel_Cancellation";
import {
  Channel,
  BOOKING_COM_MAPPING_VERSION,
} from "./bookingComCanonicalModel.js";
import { logBookingComMappingError } from "../util/bookingComLogger.js";

/**
 * Convert ISO 8601 date string to epoch milliseconds, with a safe fallback.
 *
 * @param {string} iso
 * @returns {number}
 */
function isoToEpochMs(iso) {
  if (!iso) {
    return Date.now();
  }
  const date = new Date(iso);
  const ms = date.getTime();
  return Number.isNaN(ms) ? Date.now() : ms;
}

/**
 * Internal implementation that assumes an active TypeORM EntityManager-like
 * object (either a real manager from DataSource.transaction or a mocked one
 * in tests).
 *
 * @param {any} manager
 * @param {import("./bookingComCanonicalModel.js").CanonicalBookingComMapping} canonical
 * @returns {Promise<{ channelReservationId: string }>}
 */
async function persistWithManager(manager, canonical) {
  const reservationId = randomUUID();
  const guestId = randomUUID();
  const financialId = randomUUID();

  const { reservation, guest, financialTransaction, cancellation } = canonical;

  const checkInMs = isoToEpochMs(reservation.checkInDate);
  const checkOutMs = isoToEpochMs(reservation.checkOutDate);
  const createdAtMs = isoToEpochMs(reservation.createdAt);
  const updatedAtMs = isoToEpochMs(reservation.updatedAt);

  // Channel_Reservation
  await manager
    .createQueryBuilder()
    .insert()
    .into(Channel_Reservation)
    .values({
      id: reservationId,
      externalid: reservation.externalId,
      channel: reservation.channel || Channel.BOOKING_COM,
      version: reservation.version || BOOKING_COM_MAPPING_VERSION,
      property_id: reservation.propertyId ?? null,
      booking_id: reservation.bookingId ?? null,
      status: reservation.status,
      checkindate: checkInMs,
      checkoutdate: checkOutMs,
      createdat: createdAtMs,
      updatedat: updatedAtMs,
      meta: reservation.meta ?? canonical.meta ?? null,
    })
    .execute();

  // Channel_Guest
  await manager
    .createQueryBuilder()
    .insert()
    .into(Channel_Guest)
    .values({
      id: guestId,
      channel_reservation_id: reservationId,
      fullname: guest.fullName,
      email: guest.email ?? null,
      phone: guest.phone ?? null,
      country: guest.country ?? null,
      raw_guest: guest.raw ?? null,
    })
    .execute();

  // Channel_Financial_Transaction
  await manager
    .createQueryBuilder()
    .insert()
    .into(Channel_Financial_Transaction)
    .values({
      id: financialId,
      channel_reservation_id: reservationId,
      totalamount: financialTransaction.totalAmount,
      currency: financialTransaction.currency,
      taxamount: financialTransaction.taxAmount,
      feesamount: financialTransaction.feesAmount,
      multicurrency: !!financialTransaction.multiCurrency,
      originalcurrency: financialTransaction.originalCurrency,
      originalamount: financialTransaction.originalAmount,
      raw_financial: financialTransaction.raw ?? null,
    })
    .execute();

  // Channel_Cancellation (optional)
  if (cancellation) {
    const cancellationId = randomUUID();

    await manager
      .createQueryBuilder()
      .insert()
      .into(Channel_Cancellation)
      .values({
        id: cancellationId,
        channel_reservation_id: reservationId,
        type: cancellation.type,
        effectivedate: isoToEpochMs(cancellation.effectiveDate),
        reason: cancellation.reason ?? null,
        raw_cancellation: cancellation.raw ?? null,
      })
      .execute();
  }

  return {
    channelReservationId: reservationId,
  };
}

/**
 * Persist a canonical Booking.com mapping into channel_* tables.
 *
 * This function:
 *  - Starts a TypeORM transaction (unless a transactionManager is provided).
 *  - Inserts Channel_Reservation, Channel_Guest, Channel_Financial_Transaction.
 *  - Inserts Channel_Cancellation when present.
 *
 * @param {import("./bookingComCanonicalModel.js").CanonicalBookingComMapping} canonical
 * @param {{ transactionManager?: any }} [options]
 * @returns {Promise<{ channelReservationId: string }>}
 */
export async function persistBookingComCanonicalReservation(
  canonical,
  options = {}
) {
  const { transactionManager } = options;
  const context = {
    externalId: canonical?.reservation?.externalId,
    channel: canonical?.reservation?.channel || Channel.BOOKING_COM,
    version: canonical?.reservation?.version || BOOKING_COM_MAPPING_VERSION,
  };

  try {
    if (transactionManager) {
      return await persistWithManager(transactionManager, canonical);
    }

    const client = await Database.getInstance();
    return await client.transaction((manager) =>
      persistWithManager(manager, canonical)
    );
  } catch (error) {
    logBookingComMappingError(context, error);
    throw error;
  }
}

export default persistBookingComCanonicalReservation;

