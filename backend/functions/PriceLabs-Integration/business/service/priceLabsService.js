import * as api     from "./priceLabsApiClient.js";
import { verifyPriceLabsSignature } from "./priceLabsWebhookVerifier.js";
import { Repository }               from "../../data/repository.js";
import { SystemManagerRepository }  from "../../data/systemManagerRepository.js";

const SSM_TOKEN_KEY = "/pricelabs/integration_token";
const SSM_NAME_KEY  = "/pricelabs/integration_name";

const SYNC_URL             = process.env.PL_SYNC_URL             || "";
const CALENDAR_TRIGGER_URL = process.env.PL_CALENDAR_TRIGGER_URL || "";
const HOOK_URL             = process.env.PL_HOOK_URL             || "";

const CALENDAR_DAYS = 730;

export class PriceLabsService {
  constructor() {
    this.repo = new Repository();
    this.ssm  = new SystemManagerRepository();
  }

  async _creds() {
    const [token, name] = await Promise.all([
      this.ssm.getParameter(SSM_TOKEN_KEY),
      this.ssm.getParameter(SSM_NAME_KEY),
    ]);
    return { token, name };
  }

  async connect(hostId, priceLabsEmail) {
    const { token, name } = await this._creds();

    const integrationRes = await api.updateIntegration(token, name, {
      syncUrl:            SYNC_URL,
      calendarTriggerUrl: CALENDAR_TRIGGER_URL,
      hookUrl:            HOOK_URL,
      regenerateToken:    false,
      features: {
        min_stay:                 true,
        check_in:                 true,
        check_out:                true,
        monthly_weekly_discounts: false,
        extra_person_fee:         false,
        los_pricing:              false,
        delta_only:               false,
      },
    });

    if (integrationRes?.token) {
      await this.ssm.putParameter(SSM_TOKEN_KEY, integrationRes.token);
    }

    await this.repo.upsertConnection({
      host_id:          hostId,
      pricelabs_email:  priceLabsEmail,
      is_active:        true,
      connected_at:     Date.now(),
      last_sync_status: "connected",
    });

    const [listingsResult, calendarResult, reservationsResult] = await Promise.allSettled([
      this.pushListings(hostId),
      this.pushCalendar(hostId),
      this.pushReservations(hostId),
    ]);

    return {
      success: true,
      message: "PriceLabs connected successfully.",
      initial_sync: {
        listings:     listingsResult.status     === "fulfilled" ? listingsResult.value     : { error: listingsResult.reason?.message },
        calendar:     calendarResult.status     === "fulfilled" ? calendarResult.value     : { error: calendarResult.reason?.message },
        reservations: reservationsResult.status === "fulfilled" ? reservationsResult.value : { error: reservationsResult.reason?.message },
      },
    };
  }

  async disconnect(hostId) {
    await this.repo.deactivateConnection(hostId);
    return { success: true, message: "PriceLabs disconnected." };
  }

  async getStatus(hostId) {
    const connection = await this.repo.getConnectionByHost(hostId);
    if (!connection) return { connected: false };
    return {
      connected:                 connection.is_active,
      pricelabs_email:           connection.pricelabs_email,
      last_sync_status:          connection.last_sync_status,
      last_sync_error:           connection.last_sync_error,
      last_listings_sync_at:     connection.last_listings_sync_at,
      last_calendar_sync_at:     connection.last_calendar_sync_at,
      last_reservations_sync_at: connection.last_reservations_sync_at,
    };
  }

  async pushListings(hostId) {
    const { token, name } = await this._creds();
    const connection = await this._requireActiveConnection(hostId);
    const properties = await this.repo.getPropertiesByHost(hostId);

    if (!properties.length) throw Object.assign(new Error("No properties found for this host."), { status: 404 });

    const otaMap = await this.repo.getOtaListingIdsByHost(hostId);

    const listings = properties.map((p) => ({
      listing_id:      `${hostId}_${p.id}`,
      user_token:      connection.pricelabs_email,
      name:            p.title || p.id,
      currency:        "EUR",
      country:         p.country || "NL",
      city:            p.city || "",
      bedroom_count:   p.bedrooms || 1,
      bathroom_count:  p.bathrooms || 1,
      max_guests:      p.max_guests || 2,
      listing_type:    "entire_home",
      cleaning_fee:    p.cleaning_fee == null ? 0 : Number(p.cleaning_fee),
      ota_listing_ids: otaMap[p.id] || [],
    }));

    await api.pushListings(token, name, listings);
    await this.repo.updateSyncStatus(hostId, { last_listings_sync_at: Date.now(), last_sync_status: "synced" });
    return { success: true, listings_pushed: listings.length };
  }

  async pushCalendar(hostId, listingIds = null) {
    const { token, name } = await this._creds();
    const connection = await this._requireActiveConnection(hostId);
    const properties = await this.repo.getPropertiesByHost(hostId);

    const targets = listingIds
      ? properties.filter((p) => listingIds.includes(`${hostId}_${p.id}`))
      : properties;

    for (const p of targets) {
      const listingId   = `${hostId}_${p.id}`;
      const availability = await this.repo.getAvailabilityForProperty(p.id, CALENDAR_DAYS);

      const calendar = availability.map((row) => ({
        date:                _tsToDate(row.calendar_date),
        price:               row.nightly_price || p.base_price || 100,
        available:           row.is_available !== false,
        min_stay:            row.min_stay || 1,
        closed_to_arrival:   row.closed_to_arrival   || false,
        closed_to_departure: row.closed_to_departure || false,
      }));

      await api.pushCalendar(token, name, {
        listing_id: listingId,
        user_token: connection.pricelabs_email,
        calendars: calendar,
      });
    }

    await this.repo.updateSyncStatus(hostId, { last_calendar_sync_at: Date.now(), last_sync_status: "synced" });
    return { success: true, properties_pushed: targets.length };
  }

  async pushReservations(hostId) {
    const { token, name } = await this._creds();
    const connection = await this._requireActiveConnection(hostId);
    const bookings   = await this.repo.getBookingsByHost(hostId);

    const reservations = bookings.map((b) => {
      const status = _mapBookingStatus(b.status);
      const entry = {
        listing_id:     `${hostId}_${b.property_id}`,
        user_token:     connection.pricelabs_email,
        reservation_id: b.id,
        checkin_date:   _tsToDate(b.arrivaldate),
        checkout_date:  _tsToDate(b.departuredate),
        guests:         b.guests || 1,
        total_cost:     b.total_price || 0,
        rental_revenue: b.nightly_revenue || 0,
        currency:       "EUR",
        status,
        booking_source: b.booking_source || "direct",
      };
      if (status === "cancelled") {
        entry.cancel_time = new Date().toISOString().split("T")[0];
      }
      return entry;
    });

    if (reservations.length) {
      await api.pushReservations(token, name, reservations);
    }

    await this.repo.updateSyncStatus(hostId, {
      last_reservations_sync_at: Date.now(),
      last_sync_status: "synced",
    });
    return { success: true, reservations_pushed: reservations.length };
  }

  async syncForBookingChange(hostId, trigger) {
    const connection = await this.repo.getConnectionByHost(hostId);
    if (!connection?.is_active) {
      return { skipped: true, reason: "No active PriceLabs connection for this host." };
    }

    if (trigger === "listing_updated") {
      const [listingsResult, calendarResult] = await Promise.allSettled([
        this.pushListings(hostId),
        this.pushCalendar(hostId),
      ]);
      return {
        trigger,
        listings: listingsResult.status === "fulfilled" ? listingsResult.value : { error: listingsResult.reason?.message },
        calendar: calendarResult.status === "fulfilled" ? calendarResult.value : { error: calendarResult.reason?.message },
      };
    }

    const [reservationsResult, calendarResult] = await Promise.allSettled([
      this.pushReservations(hostId),
      this.pushCalendar(hostId),
    ]);

    return {
      trigger,
      reservations: reservationsResult.status === "fulfilled" ? reservationsResult.value : { error: reservationsResult.reason?.message },
      calendar:     calendarResult.status     === "fulfilled" ? calendarResult.value     : { error: calendarResult.reason?.message },
    };
  }

  async handleSyncWebhook(headers, rawBody) {
    const { token } = await this._creds();

    if (!verifyPriceLabsSignature(headers, rawBody, token)) {
      throw Object.assign(new Error("Invalid PriceLabs signature"), { status: 401 });
    }

    const { listings = [] } = JSON.parse(rawBody || "{}");

    for (const listing of listings) {
      const { listing_id, prices = [] } = listing;
      const propertyId = listing_id.split("_").slice(1).join("_");

      for (const entry of prices) {
        await this.repo.applyPriceRecommendation({
          property_id:         propertyId,
          date:                entry.date,
          nightly_price:       entry.price,
          min_stay:            entry.min_stay,
          closed_to_arrival:   entry.closed_to_arrival,
          closed_to_departure: entry.closed_to_departure,
        });
      }
    }

    return { success: true };
  }

  async handleCalendarTriggerWebhook(headers, rawBody) {
    const { token } = await this._creds();

    if (!verifyPriceLabsSignature(headers, rawBody, token)) {
      throw Object.assign(new Error("Invalid PriceLabs signature"), { status: 401 });
    }

    const { listing_ids = [] } = JSON.parse(rawBody || "{}");

    const hostMap = {};
    for (const lid of listing_ids) {
      const hostId = lid.split("_")[0];
      if (!hostMap[hostId]) hostMap[hostId] = [];
      hostMap[hostId].push(lid);
    }

    for (const [hostId, ids] of Object.entries(hostMap)) {
      await this.pushCalendar(hostId, ids);
    }

    return { success: true };
  }

  async handleHookWebhook(headers, rawBody) {
    const { token } = await this._creds();

    if (!verifyPriceLabsSignature(headers, rawBody, token)) {
      throw Object.assign(new Error("Invalid PriceLabs signature"), { status: 401 });
    }

    const payload = JSON.parse(rawBody || "{}");
    console.warn("[PriceLabs Hook]", JSON.stringify(payload));

    if (payload.listing_id) {
      const hostId = payload.listing_id.split("_")[0];
      await this.repo.updateSyncStatus(hostId, {
        last_sync_status: "error",
        last_sync_error:  payload.message || "PriceLabs hook notification",
      });
    }

    return { success: true };
  }

  async _requireActiveConnection(hostId) {
    const c = await this.repo.getConnectionByHost(hostId);
    if (c?.is_active) return c;
    throw Object.assign(new Error("No active PriceLabs connection for this host."), { status: 400 });
  }
}

function _tsToDate(ts) {
  if (!ts) return null;
  return new Date(Number(ts)).toISOString().split("T")[0];
}

function _mapBookingStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "cancelled" || s === "canceled" || s === "declined" || s === "failed") return "cancelled";
  if (s === "paid" || s === "confirmed" || s === "awaiting payment") return "confirmed";
  return "confirmed";
}
