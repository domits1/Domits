import Database from "../ORM/index.js";

const ACTIVE_BOOKING_STATUSES = ["Paid", "Accepted", "Awaiting Payment", "Pending"];

export default class MessagingContextRepository {
  async resolveThreadParticipants({ threadId, hostId, guestId, propertyId }) {
    if (hostId && guestId) {
      return { hostId, guestId, propertyId: propertyId ?? null };
    }

    if (!threadId) {
      return { hostId: hostId ?? null, guestId: guestId ?? null, propertyId: propertyId ?? null };
    }

    const client = await Database.getInstance();
    const rows = await client.query(
      `
        SELECT id, hostid, guestid, propertyid, platform, externalthreadid, integrationaccountid
        FROM main.unified_thread
        WHERE id = $1
        LIMIT 1
      `,
      [threadId]
    );

    const row = rows?.[0] || null;
    return {
      hostId: row?.hostid ?? hostId ?? null,
      guestId: row?.guestid ?? guestId ?? null,
      propertyId: row?.propertyid ?? propertyId ?? null,
      platform: row?.platform ?? null,
      externalThreadId: row?.externalthreadid ?? null,
      integrationAccountId: row?.integrationaccountid ?? null,
    };
  }

  async getConversationContext({ threadId = null, hostId = null, guestId = null, propertyId = null }) {
    const participants = await this.resolveThreadParticipants({ threadId, hostId, guestId, propertyId });
    const client = await Database.getInstance();

    const bookingRows = await client.query(
      `
        SELECT
          b.id,
          b.guestname,
          b.arrivaldate,
          b.departuredate,
          b.hostid,
          b.property_id,
          b.status,
          p.title AS property_title,
          pl.city,
          pl.country,
          pl.street,
          pl.housenumber,
          pc.checkinfrom,
          pc.checkintill,
          pc.checkoutfrom,
          pc.checkouttill
        FROM main.booking b
        LEFT JOIN main.property p ON p.id = b.property_id
        LEFT JOIN main.property_location pl ON pl.property_id = b.property_id
        LEFT JOIN main.property_checkin pc ON pc.property_id = b.property_id
        WHERE b.hostid = $1
          AND b.guestid = $2
          AND ($3::varchar IS NULL OR b.property_id = $3)
          AND b.status = ANY($4)
        ORDER BY
          CASE
            WHEN b.arrivaldate >= $5 THEN 0
            ELSE 1
          END,
          ABS(b.arrivaldate - $5) ASC
        LIMIT 1
      `,
      [
        participants.hostId,
        participants.guestId,
        participants.propertyId,
        ACTIVE_BOOKING_STATUSES,
        Date.now(),
      ]
    );

    const row = bookingRows?.[0] || null;

    return {
      threadId,
      hostId: participants.hostId,
      guestId: participants.guestId,
      propertyId: row?.property_id ?? participants.propertyId ?? null,
      bookingId: row?.id ?? null,
      guestName: row?.guestname ?? "Guest",
      arrivalDate: row?.arrivaldate ?? null,
      departureDate: row?.departuredate ?? null,
      propertyTitle: row?.property_title ?? null,
      city: row?.city ?? null,
      country: row?.country ?? null,
      street: row?.street ?? null,
      houseNumber: row?.housenumber ?? null,
      checkInFrom: row?.checkinfrom ?? null,
      checkInTill: row?.checkintill ?? null,
      checkOutFrom: row?.checkoutfrom ?? null,
      checkOutTill: row?.checkouttill ?? null,
    };
  }

  async getDailyReminderSummary(userId) {
    const client = await Database.getInstance();

    const conversationsAwaitingResponseRows = await client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM main.unified_thread t
        WHERE t.hostid = $1
          AND t.lastinboundat IS NOT NULL
          AND (t.lastoutboundat IS NULL OR t.lastinboundat > t.lastoutboundat)
      `,
      [userId]
    );

    const pendingGuestInquiriesRows = await client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM main.unified_thread t
        WHERE t.hostid = $1
          AND t.lastinboundat IS NOT NULL
          AND t.lastoutboundat IS NULL
      `,
      [userId]
    );

    const unansweredMessagesRows = await client.query(
      `
        SELECT COUNT(*)::int AS count
        FROM main.unified_message m
        INNER JOIN main.unified_thread t ON t.id = m.threadid
        WHERE t.hostid = $1
          AND m.direction = 'INBOUND'
          AND (
            t.lastoutboundat IS NULL OR
            m.createdat > t.lastoutboundat
          )
      `,
      [userId]
    );

    return {
      conversationsAwaitingResponse: conversationsAwaitingResponseRows?.[0]?.count || 0,
      pendingGuestInquiries: pendingGuestInquiriesRows?.[0]?.count || 0,
      unansweredMessages: unansweredMessagesRows?.[0]?.count || 0,
    };
  }

  async listLifecycleBookingContextsForUser(userId) {
    const client = await Database.getInstance();
    return client.query(
      `
        SELECT
          b.id AS booking_id,
          b.guestid,
          b.guestname,
          b.hostid,
          b.property_id,
          b.arrivaldate,
          b.departuredate,
          b.status,
          t.id AS thread_id,
          t.platform,
          t.externalthreadid,
          t.integrationaccountid,
          t.lastinboundat,
          t.lastoutboundat,
          p.title AS property_title,
          pl.city,
          pl.country,
          pl.street,
          pl.housenumber,
          pc.checkinfrom,
          pc.checkintill,
          pc.checkoutfrom,
          pc.checkouttill
        FROM main.booking b
        LEFT JOIN main.unified_thread t
          ON t.hostid = b.hostid
         AND t.guestid = b.guestid
         AND (t.propertyid = b.property_id OR t.propertyid IS NULL)
         AND t.platform = 'DOMITS'
        LEFT JOIN main.property p ON p.id = b.property_id
        LEFT JOIN main.property_location pl ON pl.property_id = b.property_id
        LEFT JOIN main.property_checkin pc ON pc.property_id = b.property_id
        WHERE b.hostid = $1
          AND b.status = ANY($2)
      `,
      [userId, ACTIVE_BOOKING_STATUSES]
    );
  }
}
