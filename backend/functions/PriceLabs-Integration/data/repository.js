import { getDataSource } from "/opt/nodejs/database/dataSource.js";
import { PriceLabs_Connection } from "/opt/nodejs/models/PriceLabs_Connection.js";
import { Property } from "/opt/nodejs/models/Property.js";
import { Property_Calendar_Override } from "/opt/nodejs/models/Property_Calendar_Override.js";
import { Booking } from "/opt/nodejs/models/Booking.js";
import { ChannelIntegrationProperty } from "/opt/nodejs/models/unified/integrations/ChannelIntegrationProperty.js";
import { ChannelReservationLink } from "/opt/nodejs/models/unified/integrations/ChannelReservationLink.js";

export class Repository {
  async _ds() {
    return getDataSource();
  }

  // ── Connection ────────────────────────────────────────────────────────────

  async getConnectionByHost(hostId) {
    const ds = await this._ds();
    return ds.getRepository(PriceLabs_Connection).findOne({
      where: { host_id: hostId, is_active: true },
    });
  }

  async upsertConnection(data) {
    const ds   = await this._ds();
    const repo = ds.getRepository(PriceLabs_Connection);
    const existing = await repo.findOne({ where: { host_id: data.host_id } });
    if (existing) {
      await repo.update({ host_id: data.host_id }, data);
    } else {
      await repo.save(repo.create(data));
    }
  }

  async deactivateConnection(hostId) {
    const ds = await this._ds();
    await ds.getRepository(PriceLabs_Connection).update(
      { host_id: hostId },
      { is_active: false, last_sync_status: "disconnected" }
    );
  }

  async updateSyncStatus(hostId, fields) {
    const ds = await this._ds();
    await ds.getRepository(PriceLabs_Connection).update(
      { host_id: hostId },
      fields
    );
  }

  // ── Properties ────────────────────────────────────────────────────────────

  async getPropertiesByHost(hostId) {
    const ds = await this._ds();
    return ds.getRepository(Property).find({ where: { host_id: hostId } });
  }

  // ── Calendar (availability + pricing) ────────────────────────────────────

  async getAvailabilityForProperty(propertyId, days = 730) {
    const ds    = await this._ds();
    const from  = Date.now();
    const to    = from + days * 24 * 60 * 60 * 1000;
    return ds.getRepository(Property_Calendar_Override)
      .createQueryBuilder("cal")
      .where("cal.property_id = :propertyId", { propertyId })
      .andWhere("cal.calendar_date BETWEEN :from AND :to", { from, to })
      .orderBy("cal.calendar_date", "ASC")
      .getMany();
  }

  // ── Apply inbound price recommendation from PriceLabs sync_url ───────────

  async applyPriceRecommendation({ property_id, date, nightly_price, min_stay, closed_to_arrival, closed_to_departure }) {
    const ds = await this._ds();
    const repo = ds.getRepository(Property_Calendar_Override);

    // PriceLabs sends dates as "YYYY-MM-DD" — convert to YYYYMMDD integer
    // (the same format used everywhere else in property_calendar_override)
    const calendarDate = Number(String(date || "").replace(/-/g, ""));
    if (!calendarDate || calendarDate < 10000101 || calendarDate > 99991231) {
      console.error("[PriceLabs] Invalid date received:", date);
      return;
    }

    const existing = await repo.findOne({
      where: { property_id, calendar_date: calendarDate },
    });

    if (existing) {
      await repo.update({ property_id, calendar_date: calendarDate }, {
        nightly_price:       nightly_price ?? existing.nightly_price,
        min_stay:            min_stay       ?? existing.min_stay,
        closed_to_arrival:   closed_to_arrival   ?? existing.closed_to_arrival,
        closed_to_departure: closed_to_departure ?? existing.closed_to_departure,
        updated_at:          Date.now(),
      });
    } else {
      await repo.save(repo.create({
        property_id,
        calendar_date:       calendarDate,
        is_available:        true,
        nightly_price,
        min_stay:            min_stay || 1,
        closed_to_arrival:   closed_to_arrival   || false,
        closed_to_departure: closed_to_departure || false,
        updated_at:          Date.now(),
      }));
    }
  }

  // ── OTA Listing IDs ───────────────────────────────────────────────────────
  // Returns a map of { [domitsPropertyId]: [externalPropertyId, ...] }

  async getOtaListingIdsByHost(hostId) {
    const ds = await this._ds();

    // First get all property IDs for this host
    const properties = await ds.getRepository(Property).find({
      where: { hostid: hostId },
      select: ["id"],
    });
    const propertyIds = properties.map((p) => p.id);
    if (!propertyIds.length) return {};

    // Then fetch all channel integration properties for those IDs
    const links = await ds
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("cip")
      .where("cip.domitsPropertyId IN (:...ids)", { ids: propertyIds })
      .andWhere("cip.status = :status", { status: "active" })
      .getMany();

    // Group by domitsPropertyId
    const map = {};
    for (const link of links) {
      if (!map[link.domitsPropertyId]) map[link.domitsPropertyId] = [];
      map[link.domitsPropertyId].push(link.externalPropertyId);
    }
    return map;
  }

  // ── Bookings (with booking source from channel) ────────────────────────────

  async getBookingsByHost(hostId) {
    const ds = await this._ds();
    const bookings = await ds.getRepository(Booking).find({ where: { hostid: hostId } });
    if (!bookings.length) return [];

    // Try to enrich each booking with channel source from ChannelReservationLink
    // Match on property_id + overlapping dates
    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const link = await ds
          .getRepository(ChannelReservationLink)
          .createQueryBuilder("crl")
          .where("crl.domitsPropertyId = :pid", { pid: b.property_id })
          .andWhere("crl.checkInAt = :checkin", { checkin: b.arrivaldate })
          .getOne();

        return {
          ...b,
          booking_source: link?.channel || b.bookingtype || "direct",
        };
      })
    );

    return enriched;
  }
}
