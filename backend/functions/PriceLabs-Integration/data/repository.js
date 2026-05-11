import { getDataSource } from "/opt/nodejs/database/dataSource.js";
import { PriceLabs_Connection } from "/opt/nodejs/models/PriceLabs_Connection.js";
import { Property } from "/opt/nodejs/models/Property.js";
import { Property_Calendar_Override } from "/opt/nodejs/models/Property_Calendar_Override.js";
import { Booking } from "/opt/nodejs/models/Booking.js";

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
    const ds         = await this._ds();
    const repo       = ds.getRepository(Property_Calendar_Override);
    const calendarTs = new Date(date).getTime();

    const existing = await repo.findOne({
      where: { property_id, calendar_date: calendarTs },
    });

    if (existing) {
      await repo.update({ property_id, calendar_date: calendarTs }, {
        nightly_price:       nightly_price ?? existing.nightly_price,
        min_stay:            min_stay       ?? existing.min_stay,
        closed_to_arrival:   closed_to_arrival   ?? existing.closed_to_arrival,
        closed_to_departure: closed_to_departure ?? existing.closed_to_departure,
        updated_at:          Date.now(),
      });
    } else {
      await repo.save(repo.create({
        property_id,
        calendar_date:       calendarTs,
        is_available:        true,
        nightly_price,
        min_stay:            min_stay || 1,
        closed_to_arrival:   closed_to_arrival   || false,
        closed_to_departure: closed_to_departure || false,
        updated_at:          Date.now(),
      }));
    }
  }

  // ── Bookings ──────────────────────────────────────────────────────────────

  async getBookingsByHost(hostId) {
    const ds = await this._ds();
    return ds.getRepository(Booking).find({ where: { host_id: hostId } });
  }
}
