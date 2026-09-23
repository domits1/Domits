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

    const from = calendarIntFromDate(startDate);
    const to = calendarIntFromDate(endDate);

    const [priceRows, bookings] = await Promise.all([
      this.repo.getCalendarPriceDataForHost(hostId, from, to),
      this.repo.getBookingsByHost(hostId),
    ]);

    const bookedByProperty = bookedDateSetByProperty(bookings);
    const { total: actualRevenue } = actualRevenueByProperty(bookings, startDate, endDate);

    let grossMissedRevenue = 0;
    let unbookedNightsWithPriceData = 0;
    let unbookedNightsWithoutPriceData = 0;
    let potentialRevenue = 0;
    let potentialNightsWithPriceData = 0;
    let potentialNightsWithoutPriceData = 0;
    const byPropertyMap = new Map();

    for (const row of priceRows) {
      const iso = isoFromCalendarInt(row.calendar_date);
      const isBooked = bookedByProperty.get(row.property_id)?.has(iso) ?? false;

      if (isPotentialNight(row, isBooked)) {
        if (row.pricelabs_price == null) {
          potentialNightsWithoutPriceData += 1;
        } else {
          potentialRevenue += Number(row.pricelabs_price);
          potentialNightsWithPriceData += 1;
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

      const existing = byPropertyMap.get(row.property_id) ?? { missedRevenue: 0, unbookedNightsWithPriceData: 0 };
      existing.missedRevenue += price;
      existing.unbookedNightsWithPriceData += 1;
      byPropertyMap.set(row.property_id, existing);
    }

    const potentialOccupiedNights = potentialNightsWithPriceData + potentialNightsWithoutPriceData;
    const totalUnbookedNightsSeen = unbookedNightsWithPriceData + unbookedNightsWithoutPriceData;
    const priceDataCoveragePct =
      totalUnbookedNightsSeen > 0 ? (unbookedNightsWithPriceData / totalUnbookedNightsSeen) * 100 : 0;

    return {
      connected: true,
      startDate,
      endDate,
      currency: "EUR",
      grossMissedRevenue,
      actualRevenue,
      potentialRevenue,
      potentialOccupiedNights,
      potentialNightsWithPriceData,
      potentialNightsWithoutPriceData,
      unbookedNightsWithPriceData,
      unbookedNightsWithoutPriceData,
      priceDataCoveragePct,
      byProperty: Array.from(byPropertyMap.entries()).map(([propertyId, v]) => ({
        propertyId,
        ...v,
      })),
    };
  }
}
