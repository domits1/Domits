import Database from "database";
import { RoomPriceGenie_Integration } from "database/models/RoomPriceGenie_Integration.js";
import { Property } from "database/models/Property.js";
import { Property_Availability } from "database/models/Property_Availability.js";
import { Property_Pricing } from "database/models/Property_Pricing.js";
import { Property_Calendar_Override } from "database/models/Property_Calendar_Override.js";
import { NotFoundException } from "../util/exception/NotFoundException.js";

export class RoomPriceGenieRepository {

  // ─── Integration records ───────────────────────────────────────────────────

  async getByPropertyId(domitsPropertyId) {
    const db = await Database.getInstance();
    return db.getRepository(RoomPriceGenie_Integration).findOne({
      where: { domits_property_id: domitsPropertyId },
    });
  }

  async getAllByHost(hostId) {
    const db = await Database.getInstance();
    return db.getRepository(RoomPriceGenie_Integration).find({
      where: { host_id: hostId },
    });
  }

  async upsertIntegration(domitsPropertyId, data) {
    const db = await Database.getInstance();
    const repo = db.getRepository(RoomPriceGenie_Integration);
    const existing = await repo.findOne({ where: { domits_property_id: domitsPropertyId } });

    if (existing) {
      await repo.update({ domits_property_id: domitsPropertyId }, data);
    } else {
      await repo.save({ domits_property_id: domitsPropertyId, created_at: Date.now(), ...data });
    }
    return repo.findOne({ where: { domits_property_id: domitsPropertyId } });
  }

  async updateTokenInfo(domitsPropertyId, tokenSecretRef, tokenExpiresAt) {
    const db = await Database.getInstance();
    await db.getRepository(RoomPriceGenie_Integration).update(
      { domits_property_id: domitsPropertyId },
      { token_secret_ref: tokenSecretRef, token_expires_at: tokenExpiresAt }
    );
  }

  async deactivate(domitsPropertyId) {
    const db = await Database.getInstance();
    await db.getRepository(RoomPriceGenie_Integration).update(
      { domits_property_id: domitsPropertyId },
      {
        is_active: false,
        client_id: null,
        client_secret_ref: null,
        token_secret_ref: null,
        token_expires_at: null,
        last_sync_status: "disconnected",
      }
    );
  }

  async updateSyncStatus(domitsPropertyId, status, error = null) {
    const db = await Database.getInstance();
    await db.getRepository(RoomPriceGenie_Integration).update(
      { domits_property_id: domitsPropertyId },
      { last_sync_at: Date.now(), last_sync_status: status, last_sync_error: error }
    );
  }

  // ─── Property data (for sending to RPG) ──────────────────────────────────

  async getProperty(propertyId) {
    const db = await Database.getInstance();
    const prop = await db.getRepository(Property).findOne({ where: { id: propertyId } });
    if (!prop) throw new NotFoundException(`Property ${propertyId} not found`);
    return prop;
  }

  /**
   * Get availability data for a property over the next N days.
   * Returns rooms_left per date (grouped into date ranges for efficiency).
   */
  async getAvailabilityForProperty(propertyId, daysAhead = 548) {
    const db = await Database.getInstance();
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + daysAhead);

    return db.getRepository(Property_Availability)
      .createQueryBuilder("a")
      .where("a.property_id = :propertyId", { propertyId })
      .andWhere("a.date >= :start", { start: now.toISOString().split("T")[0] })
      .andWhere("a.date <= :end", { end: end.toISOString().split("T")[0] })
      .orderBy("a.date", "ASC")
      .getMany();
  }

  /**
   * Get base pricing for a property.
   */
  async getPricingForProperty(propertyId) {
    const db = await Database.getInstance();
    return db.getRepository(Property_Pricing).findOne({ where: { property_id: propertyId } });
  }

  // ─── Incoming price recommendations (RPG → Domits webhook) ────────────────

  /**
   * Save RPG price recommendations into Property_Calendar_Override.
   * This is called when RPG pushes prices to our webhook endpoint.
   *
   * Each entry: { property_id, calendar_date (ms), nightly_price }
   * RPG sends date ranges, so we expand them here.
   */
  async applyPriceRecommendations(propertyId, recommendations) {
    if (!recommendations?.length) return 0;

    const db = await Database.getInstance();
    const repo = db.getRepository(Property_Calendar_Override);
    let count = 0;

    for (const rec of recommendations) {
      // rec.start_date and rec.end_date are "YYYY-MM-DD" strings, price is integer
      const start = new Date(rec.start_date);
      const end = new Date(rec.end_date);
      const price = rec.price;

      // Expand date range day by day
      const current = new Date(start);
      while (current <= end) {
        const dateMs = current.getTime();
        const existing = await repo.findOne({
          where: { property_id: propertyId, calendar_date: dateMs },
        });

        if (existing) {
          // Only overwrite if NOT manually set by the host
          // (manual overrides have a separate flag or source tracking)
          await repo.update(
            { property_id: propertyId, calendar_date: dateMs },
            { nightly_price: price, updated_at: Date.now() }
          );
        } else {
          await repo.save({
            property_id: propertyId,
            calendar_date: dateMs,
            nightly_price: price,
            is_available: true,
            updated_at: Date.now(),
          });
        }
        count++;
        current.setDate(current.getDate() + 1);
      }
    }

    return count;
  }
}
