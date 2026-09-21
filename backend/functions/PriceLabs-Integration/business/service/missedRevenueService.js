const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isBookedStatus(status) {
  const s = String(status || "").toLowerCase();
  return s !== "cancelled" && s !== "canceled" && s !== "declined" && s !== "failed";
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

    let grossMissedRevenue = 0;
    let unbookedNightsWithPriceData = 0;
    let unbookedNightsWithoutPriceData = 0;
    const byPropertyMap = new Map();

    for (const row of priceRows) {
      const iso = isoFromCalendarInt(row.calendar_date);
      const isBooked = bookedByProperty.get(row.property_id)?.has(iso) ?? false;
      if (isBooked) continue;

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

    const totalUnbookedNightsSeen = unbookedNightsWithPriceData + unbookedNightsWithoutPriceData;
    const priceDataCoveragePct =
      totalUnbookedNightsSeen > 0 ? (unbookedNightsWithPriceData / totalUnbookedNightsSeen) * 100 : 0;

    return {
      connected: true,
      startDate,
      endDate,
      grossMissedRevenue,
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
