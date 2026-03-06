import Database from "../ORM/index.js";
import { randomUUID } from "node:crypto";

import { ChannelReservationLink } from "../models/unified/integrations/ChannelReservationLink.js";

class ReservationLinkRepository {
  async upsert(data) {
    const client = await Database.getInstance();

    const existing = await client
      .getRepository(ChannelReservationLink)
      .createQueryBuilder("r")
      .where("r.integrationAccountId = :a", { a: data.integrationAccountId })
      .andWhere("r.channel = :c", { c: data.channel })
      .andWhere("r.externalReservationId = :e", { e: data.externalReservationId })
      .getOne();

    const now = Date.now();

    if (existing) {
      const next = {
        ...existing,
        externalThreadId: data.externalThreadId ?? existing.externalThreadId,
        domitsThreadId: data.domitsThreadId ?? existing.domitsThreadId,
        domitsPropertyId: data.domitsPropertyId ?? existing.domitsPropertyId,
        guestName: data.guestName ?? existing.guestName,
        checkInAt: data.checkInAt ?? existing.checkInAt,
        checkOutAt: data.checkOutAt ?? existing.checkOutAt,
        reservationStatus: data.reservationStatus ?? existing.reservationStatus,
        ratePlan: data.ratePlan ?? existing.ratePlan,
        paymentStatus: data.paymentStatus ?? existing.paymentStatus,
        rawPayload: data.rawPayload ?? existing.rawPayload,
        updatedAt: now,
      };

      await client
        .createQueryBuilder()
        .update(ChannelReservationLink)
        .set({
          externalThreadId: next.externalThreadId,
          domitsThreadId: next.domitsThreadId,
          domitsPropertyId: next.domitsPropertyId,
          guestName: next.guestName,
          checkInAt: next.checkInAt,
          checkOutAt: next.checkOutAt,
          reservationStatus: next.reservationStatus,
          ratePlan: next.ratePlan,
          paymentStatus: next.paymentStatus,
          rawPayload: next.rawPayload,
          updatedAt: next.updatedAt,
        })
        .where("id = :id", { id: existing.id })
        .execute();

      return next;
    }

    const row = {
      id: randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await client.createQueryBuilder().insert().into(ChannelReservationLink).values(row).execute();
    return row;
  }
}

export default ReservationLinkRepository;
