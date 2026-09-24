import { validateDateRange } from "../../util/dateRange.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Only a secured booking blocks a night. Inquiry and Awaiting Payment aren't
// secured yet, so the night still counts toward missed revenue until they convert.
const BOOKED_STATUSES = new Set(["confirmed", "accepted", "paid", "completed"]);

function isBookedStatus(status) {
  return BOOKED_STATUSES.has(String(status || "").toLowerCase());
}

function isoFromTimestamp(ts) {
  if (!ts) return null;
  return new Date(Number(ts)).toISOString().slice(0, 10);
}

function isoFromCalendarInt(calendarDate) {
  const s = String(calendarDate);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function calendarIntFromDate(dateStr) {
  return Number(String(dateStr).replaceAll("-", ""));
}

/**
 * Maps bookings to a per-property Set of booked ISO dates (checkout day excluded).
 * Mirrors the equivalent private helper in priceLabsService.js.
 */
function bookedDateSetByProperty(bookings) {
  const map = new Map();
  for (const b of bookings) {
    if (!isBookedStatus(b.status)) continue;
    const start = isoFromTimestamp(b.arrivaldate);
    const end = isoFromTimestamp(b.departuredate);
    if (!start || !end) continue;

    const startMs = Date.parse(`${start}T00:00:00Z`);
    const endMs = Date.parse(`${end}T00:00:00Z`);

    if (!map.has(b.property_id)) map.set(b.property_id, new Set());
    const set = map.get(b.property_id);
    for (let ms = startMs; ms < endMs; ms += MS_PER_DAY) {
      set.add(new Date(ms).toISOString().slice(0, 10));
    }
  }
  return map;
}

/**
 * Prorates each booking's total_price evenly across its nights and sums the
 * nights that fall within [startDate, endDate], per property. Not gated on
 * priceRows/PriceLabs sync coverage: a booking can predate the PriceLabs
 * connection, and gating actual revenue on that would understate real money.
 *
 * total_price is stored in euros; refunded_amount is stored in cents (see
 * General-Bookings-CRUD-Bookings-develop/data/stripeRepository.js and
 * reservationController.js), so refunds are converted before netting.
 */
function actualRevenueByProperty(bookings, startDate, endDate) {
  const rangeStartMs = Date.parse(`${startDate}T00:00:00Z`);
  const rangeEndMs = Date.parse(`${endDate}T00:00:00Z`) + MS_PER_DAY; // exclusive

  const byProperty = new Map();
  let total = 0;

  for (const b of bookings) {
    if (!isBookedStatus(b.status)) continue;
    const start = isoFromTimestamp(b.arrivaldate);
    const end = isoFromTimestamp(b.departuredate);
    if (!start || !end) continue;

    const startMs = Date.parse(`${start}T00:00:00Z`);
    const endMs = Date.parse(`${end}T00:00:00Z`);
    const totalNights = Math.round((endMs - startMs) / MS_PER_DAY);
    if (totalNights <= 0) continue;

    // Clamped at 0: an over-refund (refunded_amount > total_price) is a data
    // anomaly, not a real negative revenue contribution to show on a KPI card.
    const netTotal = Math.max(0, (Number(b.total_price) || 0) - (Number(b.refunded_amount) || 0) / 100);
    const nightlyShare = netTotal / totalNights;

    for (let ms = startMs; ms < endMs; ms += MS_PER_DAY) {
      if (ms < rangeStartMs || ms >= rangeEndMs) continue;
      total += nightlyShare;
      byProperty.set(b.property_id, (byProperty.get(b.property_id) ?? 0) + nightlyShare);
    }
  }

  return { total, byProperty };
}

/**
 * A night is flagged "restriction" when PriceLabs closed it to arrival/departure,
 * or when a min_stay greater than 1 was in effect. min_stay is nullable with no
 * reliable default (null after disconnect or if never synced; only PriceLabs-fresh
 * rows default it to 1) - null/undefined means "no restriction data", not
 * "min_stay=1".
 *
 * This does NOT claim the restriction caused the missed booking - min_stay's
 * scope (arrival-day-only vs. stay-through) is unresolved in this codebase: the
 * Channex ARI integration maps it to "min_stay_through", but the PriceLabs
 * webhook bundles it per-date alongside check_in/check_out, suggesting
 * arrival-scoped. Nothing reconciles these. We only surface that a restriction
 * signal was present on the date, as a contributing-factor category, not a
 * sentence asserting causation.
 */
function hasRestrictionSignal(row) {
  if (row.closed_to_arrival === true) return true;
  if (row.closed_to_departure === true) return true;
  if (row.min_stay != null && Number(row.min_stay) > 1) return true;
  return false;
}

/**
 * restriction > pricing > occupancy: restriction is the most concrete/certain
 * signal, pricing is a same-property heuristic (see isPricingOutlier), occupancy
 * is the fallback when neither concrete signal applies.
 */
function categorizeMissedNight(row) {
  if (hasRestrictionSignal(row)) return "restriction";
  return "occupancy";
}

function ensureProperty(byPropertyMap, propertyId) {
  if (!byPropertyMap.has(propertyId)) {
    byPropertyMap.set(propertyId, {
      missedRevenue: 0,
      unbookedNightsWithPriceData: 0,
      actualRevenue: 0,
      potentialRevenue: 0,
      potentialOccupiedNights: 0,
    });
  }
  return byPropertyMap.get(propertyId);
}

/**
 * A calendar row does not represent real missed revenue when the host has taken
 * it off the market themselves: blocked, stop-sell, ignored by PriceLabs, or the
 * property isn't live.
 */
function isSellableNight(row) {
  if (row.is_available === false) return false;
  if (row.stop_sell === true) return false;
  if (row.pricelabs_ignored === true) return false;
  if (row.property_status && row.property_status !== "ACTIVE") return false;
  return true;
}

/**
 * Broader than isSellableNight: a night the host has booked still counts as a
 * "potential occupied night" for Potential Revenue, priced at pricelabs_price
 * rather than what was actually charged. is_available only disqualifies a
 * night when it's a genuine host block (i.e. not booked) — is_available also
 * goes false for already-booked nights, so it can't be used on its own here.
 */
function isPotentialNight(row, isBooked) {
  if (row.stop_sell === true) return false;
  if (row.pricelabs_ignored === true) return false;
  if (row.property_status && row.property_status !== "ACTIVE") return false;
  if (row.is_available === false && !isBooked) return false;
  return true;
}

export class MissedRevenueService {
  constructor({ repository } = {}) {
    this.repo = repository;
  }

  /**
   * v1-plus: gross missed revenue for unbooked nights only, priced at PriceLabs'
   * suggested nightly rate rather than the host's flat average ADR. Booked nights
   * are intentionally excluded, since estimating an "underpriced booked night" gap
   * would require assumptions this data doesn't reliably support yet.
   */
  async getMissedRevenue(hostId, startDate, endDate) {
    validateDateRange(startDate, endDate);

    const connection = await this.repo.getConnectionByHost(hostId);
    if (!connection?.is_active) {
      return { connected: false };
    }

    const bookings = await this.repo.getBookingsByHost(hostId);
    const current = await this._computePeriodMetrics(hostId, startDate, endDate, bookings);

    return {
      connected: true,
      startDate,
      endDate,
      currency: "EUR",
      ...current,
    };
  }

  async _computePeriodMetrics(hostId, startDate, endDate, bookings) {
    const from = calendarIntFromDate(startDate);
    const to = calendarIntFromDate(endDate);

    const priceRows = await this.repo.getCalendarPriceDataForHost(hostId, from, to);

    const bookedByProperty = bookedDateSetByProperty(bookings);
    const { total: actualRevenue, byProperty: actualRevenueByPropertyMap } = actualRevenueByProperty(
      bookings,
      startDate,
      endDate
    );

    let grossMissedRevenue = 0;
    let unbookedNightsWithPriceData = 0;
    let unbookedNightsWithoutPriceData = 0;
    let potentialRevenue = 0;
    let potentialNightsWithPriceData = 0;
    let potentialNightsWithoutPriceData = 0;
    const byPropertyMap = new Map();
    const byDateMap = new Map();
    const rootCause = {
      restriction: { missedRevenue: 0, nights: 0 },
      pricing: { missedRevenue: 0, nights: 0 },
      occupancy: { missedRevenue: 0, nights: 0 },
    };

    for (const row of priceRows) {
      const iso = isoFromCalendarInt(row.calendar_date);
      const isBooked = bookedByProperty.get(row.property_id)?.has(iso) ?? false;

      if (isPotentialNight(row, isBooked)) {
        const propEntry = ensureProperty(byPropertyMap, row.property_id);
        propEntry.potentialOccupiedNights += 1;

        if (row.pricelabs_price == null) {
          potentialNightsWithoutPriceData += 1;
        } else {
          const price = Number(row.pricelabs_price);
          potentialRevenue += price;
          potentialNightsWithPriceData += 1;
          propEntry.potentialRevenue += price;
        }
      }

      if (!isSellableNight(row) || isBooked) continue;

      if (row.pricelabs_price == null) {
        unbookedNightsWithoutPriceData += 1;
        continue;
      }

      const price = Number(row.pricelabs_price);
      grossMissedRevenue += price;
      unbookedNightsWithPriceData += 1;
      byDateMap.set(iso, (byDateMap.get(iso) ?? 0) + price);

      const category = categorizeMissedNight(row);
      rootCause[category].missedRevenue += price;
      rootCause[category].nights += 1;

      const existing = ensureProperty(byPropertyMap, row.property_id);
      existing.missedRevenue += price;
      existing.unbookedNightsWithPriceData += 1;
    }

    for (const [propertyId, amount] of actualRevenueByPropertyMap) {
      ensureProperty(byPropertyMap, propertyId).actualRevenue += amount;
    }

    const potentialOccupiedNights = potentialNightsWithPriceData + potentialNightsWithoutPriceData;
    const revenueEfficiencyPct = potentialRevenue > 0 ? (actualRevenue / potentialRevenue) * 100 : 0;
    const totalUnbookedNightsSeen = unbookedNightsWithPriceData + unbookedNightsWithoutPriceData;
    const priceDataCoveragePct =
      totalUnbookedNightsSeen > 0 ? (unbookedNightsWithPriceData / totalUnbookedNightsSeen) * 100 : 0;

    const byDate = Array.from(byDateMap.entries())
      .filter(([, missedRevenue]) => missedRevenue > 0)
      .map(([date, missedRevenue]) => ({ date, missedRevenue }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return {
      grossMissedRevenue,
      actualRevenue,
      potentialRevenue,
      potentialOccupiedNights,
      potentialNightsWithPriceData,
      potentialNightsWithoutPriceData,
      revenueEfficiencyPct,
      unbookedNightsWithPriceData,
      unbookedNightsWithoutPriceData,
      priceDataCoveragePct,
      byProperty: Array.from(byPropertyMap.entries()).map(([propertyId, v]) => ({
        propertyId,
        ...v,
      })),
      byDate,
      rootCause,
    };
  }
}
