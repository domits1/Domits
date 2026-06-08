import Database from "database";
import { PriceLabs_Connection } from "database/models/PriceLabs_Connection";
import { Property } from "database/models/Property";
import { Property_Location } from "database/models/Property_Location";
import { Property_Calendar_Override } from "database/models/Property_Calendar_Override";
import { Booking } from "database/models/Booking";
import { ChannelIntegrationProperty } from "database/models/unified/integrations/ChannelIntegrationProperty";
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

  /**
   * On disconnect: clear all PriceLabs-set data from the calendar overrides for
   * all properties owned by this host. This restores the host's original prices
   * and removes all PriceLabs-written restrictions.
   *
   * Only pricelabs_price, min_stay, closed_to_arrival, and closed_to_departure
   * are cleared — nightly_price (host-set) and is_available are preserved.
   */
  async clearPriceLabsDataForHost(hostId) {
    const ds = await this._ds();

    // Get all property IDs for this host
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
          pricelabs_price:     null,
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


  async applyPriceRecommendation({ property_id, date, nightly_price, min_stay, closed_to_arrival, closed_to_departure }) {
    const ds = await this._ds();
    const repo = ds.getRepository(Property_Calendar_Override);

    const calendarDate = Number(String(date ?? "").replaceAll("-", ""));
    if (!calendarDate || calendarDate < 10000101 || calendarDate > 99991231) {
      console.error("[PriceLabs] Invalid date received:", date);
      return;
    }

    const existing = await repo.findOne({
      where: { property_id, calendar_date: calendarDate },
    });

    if (existing) {
      // Write to pricelabs_price (suggestion) — never overwrite host's nightly_price.
      // Also update restrictions if provided (min_stay, check_in/out).
      await repo.update({ property_id, calendar_date: calendarDate }, {
        pricelabs_price:     nightly_price ?? existing.pricelabs_price,
        min_stay:            min_stay       ?? existing.min_stay,
        closed_to_arrival:   closed_to_arrival   ?? existing.closed_to_arrival,
        closed_to_departure: closed_to_departure ?? existing.closed_to_departure,
        updated_at:          Date.now(),
      });
    } else {
      await repo.save(repo.create({
        property_id,
        calendar_date:       calendarDate,
        // is_available is intentionally omitted — PriceLabs should not force
        // availability overrides. Availability is determined by the host.
        // pricelabs_price holds the suggestion; host must explicitly apply it
        // to nightly_price via the "Apply price" button in the calendar.
        pricelabs_price:     nightly_price,
        min_stay:            min_stay || 1,
        closed_to_arrival:   closed_to_arrival   || false,
        closed_to_departure: closed_to_departure || false,
        updated_at:          Date.now(),
      }));
    }
  }


  async getOtaListingIdsByHost(hostId) {
    const ds = await this._ds();

    const properties = await ds.getRepository(Property).find({
      where: { hostid: hostId },
      select: ["id"],
    });
    const propertyIds = properties.map((p) => p.id);
    if (!propertyIds.length) return {};

    const links = await ds
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("cip")
      .where("cip.domitsPropertyId IN (:...ids)", { ids: propertyIds })
      .andWhere("cip.status = :status", { status: "active" })
      .getMany();

    const map = {};
    for (const link of links) {
      if (!map[link.domitsPropertyId]) map[link.domitsPropertyId] = [];
      map[link.domitsPropertyId].push(link.externalPropertyId);
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
