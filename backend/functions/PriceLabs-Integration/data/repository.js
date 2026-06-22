import Database from "database";
import { PriceLabs_Connection } from "database/models/PriceLabs_Connection";
import { Property } from "database/models/Property";
import { Property_Location } from "database/models/Property_Location";
import { Property_Calendar_Override } from "database/models/Property_Calendar_Override";
import { Booking } from "database/models/Booking";
import { ChannelIntegrationProperty } from "database/models/unified/integrations/ChannelIntegrationProperty";
import { ChannelIntegrationAccount } from "database/models/unified/integrations/ChannelIntegrationAccount";
import { ChannelReservationLink } from "database/models/unified/integrations/ChannelReservationLink";

export class Repository {
  async _ds() {
    return Database.getInstance();
  }


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

  async clearPriceLabsDataForHost(hostId) {
    const ds = await this._ds();

    const properties = await ds.getRepository(Property).find({
      where: { hostid: hostId },
      select: ["id"],
    });
    if (!properties.length) return;

    const propertyIds = properties.map((p) => p.id);

    const repo = ds.getRepository(Property_Calendar_Override);
    for (const propertyId of propertyIds) {
      await repo.createQueryBuilder()
        .update()
        .set({
          nightly_price:       () => "CASE WHEN nightly_price = pricelabs_price THEN NULL ELSE nightly_price END",
          pricelabs_price:     null,
          pricelabs_ignored:   false,
          min_stay:            null,
          closed_to_arrival:   null,
          closed_to_departure: null,
          updated_at:          Date.now(),
        })
        .where("property_id = :propertyId", { propertyId })
        .execute();
    }
  }

  async updateSyncStatus(hostId, fields) {
    const ds = await this._ds();
    await ds.getRepository(PriceLabs_Connection).update(
      { host_id: hostId },
      fields
    );
  }


  async getPropertiesByHost(hostId) {
    const ds = await this._ds();
    const properties = await ds.getRepository(Property).find({ where: { hostid: hostId } });

    const locationMap = {};
    if (properties.length) {
      const ids = properties.map((p) => p.id);
      const locations = await ds.getRepository(Property_Location)
        .createQueryBuilder("loc")
        .where("loc.property_id IN (:...ids)", { ids })
        .getMany();
      for (const loc of locations) {
        locationMap[loc.property_id] = loc;
      }
    }

    return properties.map((p) => ({
      ...p,
      city:      locationMap[p.id]?.city      ?? "",
      country:   locationMap[p.id]?.country   ?? "NL",
      latitude:  locationMap[p.id]?.latitude  ?? null,
      longitude: locationMap[p.id]?.longitude ?? null,
    }));
  }


  async getAvailabilityForProperty(propertyId, days = 730) {
    const ds  = await this._ds();
    const now = new Date();
    const fut = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const from = Number.parseInt(now.toISOString().slice(0, 10).replaceAll("-", ""));
    const to   = Number.parseInt(fut.toISOString().slice(0, 10).replaceAll("-", ""));
    return ds.getRepository(Property_Calendar_Override)
      .createQueryBuilder("cal")
      .where("cal.property_id = :propertyId", { propertyId })
      .andWhere("cal.calendar_date BETWEEN :from AND :to", { from, to })
      .orderBy("cal.calendar_date", "ASC")
      .getMany();
  }


  /**
   * Batch variant of the old applyPriceRecommendation. The PriceLabs sync webhook
   * pushes 12-18 months of prices per listing; writing those one date at a time
   * (SELECT + UPDATE per date) exceeded the Lambda timeout. This writes them with
   * one SELECT and chunked multi-row upserts instead.
   */
  async applyPriceRecommendations(property_id, items) {
    const ds = await this._ds();
    const repo = ds.getRepository(Property_Calendar_Override);

    const normalized = [];
    for (const item of Array.isArray(items) ? items : []) {
      const calendarDate = Number(String(item.date ?? "").replaceAll("-", ""));
      if (!calendarDate || calendarDate < 10000101 || calendarDate > 99991231) {
        continue;
      }
      normalized.push({ ...item, calendar_date: calendarDate });
    }
    if (!normalized.length) return;

    const dates = normalized.map((n) => n.calendar_date);
    const existingRows = await repo.createQueryBuilder("cal")
      .where("cal.property_id = :property_id", { property_id })
      .andWhere("cal.calendar_date IN (:...dates)", { dates })
      .getMany();
    const existingByDate = new Map(existingRows.map((row) => [Number(row.calendar_date), row]));

    const now = Date.now();
    const rows = normalized.map((n) => {
      const existing = existingByDate.get(n.calendar_date);
      if (existing) {
        return {
          property_id,
          calendar_date:       n.calendar_date,
          pricelabs_price:     n.nightly_price ?? existing.pricelabs_price,
          pricelabs_ignored:   false,
          min_stay:            n.min_stay ?? existing.min_stay,
          closed_to_arrival:   n.closed_to_arrival   ?? existing.closed_to_arrival,
          closed_to_departure: n.closed_to_departure ?? existing.closed_to_departure,
          updated_at:          now,
        };
      }
      return {
        property_id,
        calendar_date:       n.calendar_date,
        pricelabs_price:     n.nightly_price,
        pricelabs_ignored:   false,
        min_stay:            n.min_stay || 1,
        closed_to_arrival:   n.closed_to_arrival   || false,
        closed_to_departure: n.closed_to_departure || false,
        updated_at:          now,
      };
    });

    const CHUNK_SIZE = 250;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      await repo.createQueryBuilder()
        .insert()
        .values(rows.slice(i, i + CHUNK_SIZE))
        .orUpdate(
          ["pricelabs_price", "pricelabs_ignored", "min_stay", "closed_to_arrival", "closed_to_departure", "updated_at"],
          ["property_id", "calendar_date"]
        )
        .execute();
    }
  }


  /**
   * Returns a map of propertyId → ota_listing_ids in the shape PriceLabs expects:
   * { airbnb: { id }, bookingcom: { id }, vrbo: { id }, other: { <channel>: { id } } }
   */
  async getOtaListingIdsByHost(hostId) {
    const ds = await this._ds();

    const properties = await ds.getRepository(Property).find({
      where: { hostid: hostId },
      select: ["id"],
    });
    const propertyIds = properties.map((p) => p.id);
    if (!propertyIds.length) return {};

    const rows = await ds
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("cip")
      .innerJoin(ChannelIntegrationAccount, "acc", "acc.id = cip.integrationAccountId")
      .select("cip.domitsPropertyId", "domitsPropertyId")
      .addSelect("cip.externalPropertyId", "externalPropertyId")
      .addSelect("acc.channel", "channel")
      .where("cip.domitsPropertyId IN (:...ids)", { ids: propertyIds })
      .andWhere("cip.status = :status", { status: "active" })
      .getRawMany();

    const KNOWN_CHANNELS = { airbnb: "airbnb", bookingcom: "bookingcom", vrbo: "vrbo" };

    const map = {};
    for (const row of rows) {
      const normalized = String(row.channel || "").toLowerCase().replaceAll(/[^a-z]/g, "");
      const key = KNOWN_CHANNELS[normalized];
      if (!map[row.domitsPropertyId]) map[row.domitsPropertyId] = {};
      const entry = { id: String(row.externalPropertyId) };
      if (key) {
        map[row.domitsPropertyId][key] = entry;
      } else {
        if (!map[row.domitsPropertyId].other) map[row.domitsPropertyId].other = {};
        map[row.domitsPropertyId].other[normalized || "unknown"] = entry;
      }
    }
    return map;
  }


  async getBookingsByHost(hostId) {
    const ds = await this._ds();
    const bookings = await ds.getRepository(Booking).find({ where: { hostid: hostId } });
    if (!bookings.length) return [];

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
          booking_source: link?.channel ?? b.bookingtype ?? "direct",
        };
      })
    );

    return enriched;
  }
}
