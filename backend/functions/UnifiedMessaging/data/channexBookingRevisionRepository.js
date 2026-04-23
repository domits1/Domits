import Database from "../ORM/index.js";
import { randomUUID } from "node:crypto";

import { ChannexBookingRevision } from "../models/unified/integrations/ChannexBookingRevision.js";

class ChannexBookingRevisionRepository {
  async getByIntegrationAccountIdAndRevisionId(integrationAccountId, revisionId) {
    const client = await Database.getInstance();
    return client.getRepository(ChannexBookingRevision).findOne({
      where: {
        integrationAccountId,
        revisionId,
      },
    });
  }

  async upsert(data) {
    const client = await Database.getInstance();
    const existing = await this.getByIntegrationAccountIdAndRevisionId(data.integrationAccountId, data.revisionId);
    const now = Date.now();

    if (existing) {
      const next = {
        ...existing,
        domitsPropertyId: data.domitsPropertyId ?? existing.domitsPropertyId,
        externalPropertyId: data.externalPropertyId ?? existing.externalPropertyId,
        externalReservationId: data.externalReservationId ?? existing.externalReservationId,
        bookingStatus: data.bookingStatus ?? existing.bookingStatus,
        arrivalDate: data.arrivalDate ?? existing.arrivalDate,
        departureDate: data.departureDate ?? existing.departureDate,
        guestSummary: data.guestSummary ?? existing.guestSummary,
        rawPayload: data.rawPayload ?? existing.rawPayload,
        acknowledgementState: data.acknowledgementState ?? existing.acknowledgementState,
        acknowledgedAt:
          data.acknowledgedAt !== undefined ? data.acknowledgedAt : existing.acknowledgedAt,
        updatedAt: now,
      };

      await client
        .createQueryBuilder()
        .update(ChannexBookingRevision)
        .set({
          domitsPropertyId: next.domitsPropertyId,
          externalPropertyId: next.externalPropertyId,
          externalReservationId: next.externalReservationId,
          bookingStatus: next.bookingStatus,
          arrivalDate: next.arrivalDate,
          departureDate: next.departureDate,
          guestSummary: next.guestSummary,
          rawPayload: next.rawPayload,
          acknowledgementState: next.acknowledgementState,
          acknowledgedAt: next.acknowledgedAt,
          updatedAt: next.updatedAt,
        })
        .where("id = :id", { id: existing.id })
        .execute();

      return next;
    }

    const row = {
      id: randomUUID(),
      ...data,
      acknowledgementState: data.acknowledgementState ?? "RECEIVED",
      acknowledgedAt: data.acknowledgedAt ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await client.createQueryBuilder().insert().into(ChannexBookingRevision).values(row).execute();
    return row;
  }

  async markAcknowledged(integrationAccountId, revisionId, acknowledgedAt = Date.now()) {
    const client = await Database.getInstance();
    const existing = await this.getByIntegrationAccountIdAndRevisionId(integrationAccountId, revisionId);
    if (!existing) return null;

    const next = {
      ...existing,
      acknowledgementState: "ACKNOWLEDGED",
      acknowledgedAt,
      updatedAt: acknowledgedAt,
    };

    await client
      .createQueryBuilder()
      .update(ChannexBookingRevision)
      .set({
        acknowledgementState: next.acknowledgementState,
        acknowledgedAt: next.acknowledgedAt,
        updatedAt: next.updatedAt,
      })
      .where("id = :id", { id: existing.id })
      .execute();

    return next;
  }
}

export default ChannexBookingRevisionRepository;
