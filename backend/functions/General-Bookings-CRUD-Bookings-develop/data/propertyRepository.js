import Database from "database";
import { Property } from "database/models/Property";
import NotFoundException from "../util/exception/NotFoundException.js";
import ConflictException from "../util/exception/ConflictException.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toCalendarDateInt = (date) =>
  Number(
    `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(
      2,
      "0"
    )}`
  );

const normalizeValueToCalendarInt = (value) => {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (DATE_KEY_PATTERN.test(trimmed)) {
      return Number(trimmed.replaceAll("-", ""));
    }
    if (/^\d{8}$/.test(trimmed)) {
      return Number(trimmed);
    }
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return null;

  const truncatedValue = Math.trunc(numericValue);
  if (truncatedValue >= 10000101 && truncatedValue <= 99991231) {
    return truncatedValue;
  }

  const milliseconds = truncatedValue > 1000000000000 ? truncatedValue : truncatedValue * 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : toCalendarDateInt(date);
};

const buildStayCalendarDateInts = (arrivalDateMs, departureDateMs) => {
  const arrivalDate = new Date(arrivalDateMs);
  const departureDate = new Date(departureDateMs);
  if (Number.isNaN(arrivalDate.getTime()) || Number.isNaN(departureDate.getTime())) {
    return [];
  }

  const stayDates = [];
  const endExclusive = Date.UTC(
    departureDate.getUTCFullYear(),
    departureDate.getUTCMonth(),
    departureDate.getUTCDate()
  );

  for (
    let cursor = Date.UTC(arrivalDate.getUTCFullYear(), arrivalDate.getUTCMonth(), arrivalDate.getUTCDate());
    cursor < endExclusive;
    cursor += DAY_MS
  ) {
    stayDates.push(toCalendarDateInt(new Date(cursor)));
  }

  return stayDates;
};

const hasAvailabilityWindowForDate = (availabilityWindows, calendarDate) =>
  availabilityWindows.some((window) => {
    const startDate = normalizeValueToCalendarInt(window?.availablestartdate ?? window?.availableStartDate);
    const endDate = normalizeValueToCalendarInt(window?.availableenddate ?? window?.availableEndDate);
    return startDate && endDate && calendarDate >= startDate && calendarDate <= endDate;
  });

const buildOverrideAvailabilityMap = (calendarOverrides) =>
  new Map(
    (Array.isArray(calendarOverrides) ? calendarOverrides : [])
      .map((override) => {
        const date = normalizeValueToCalendarInt(override?.calendar_date ?? override?.date);
        if (!date || override?.is_available === undefined || override?.is_available === null) {
          return null;
        }
        return [date, Boolean(override.is_available)];
      })
      .filter(Boolean)
  );

class PropertyRepository {
  constructor() {}

  async assertBookingDatesAvailable({ propertyId, arrivalDateMs, departureDateMs }) {
    const stayDates = buildStayCalendarDateInts(arrivalDateMs, departureDateMs);
    if (stayDates.length === 0) {
      throw new ConflictException("Selected dates are not available.");
    }

    const startDate = Math.min(...stayDates);
    const endDate = Math.max(...stayDates);
    const client = await Database.getInstance();
    const [availabilityWindows, calendarOverrides] = await Promise.all([
      client.query(
        `
          SELECT availablestartdate, availableenddate
          FROM property_availability
          WHERE property_id = $1
        `,
        [propertyId]
      ),
      client.query(
        `
          SELECT calendar_date, is_available
          FROM property_calendar_override
          WHERE property_id = $1
            AND calendar_date >= $2
            AND calendar_date <= $3
        `,
        [propertyId, startDate, endDate]
      ),
    ]);

    const overrideAvailabilityByDate = buildOverrideAvailabilityMap(calendarOverrides);
    const unavailableDate = stayDates.find((calendarDate) => {
      if (overrideAvailabilityByDate.has(calendarDate)) {
        return overrideAvailabilityByDate.get(calendarDate) !== true;
      }
      return !hasAvailabilityWindowForDate(availabilityWindows, calendarDate);
    });

    if (unavailableDate) {
      throw new ConflictException("Selected dates are not available.");
    }

    return true;
  }

  async getPropertyById(id) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Property)
      .createQueryBuilder("property")
      .where("property.id = :id", { id: id })
      .getOne();
    if (result) {
      return {
        hostId: result.hostid,
        title: result.title,
        bookingType: result.bookingtype || "direct",
      };
    } else {
      throw new NotFoundException("Property is inactive or does not exist.");
    }
  }

  async getCancellationPolicyByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const rule = await client
      .createQueryBuilder()
      .select("pr.rule", "rule")
      .from("property_rule", "pr")
      .where("pr.property_id = :propertyId", { propertyId })
      .andWhere("pr.rule LIKE 'CancellationPolicy:%'")
      .andWhere("pr.value = :value", { value: true })
      .getRawOne();
    return rule ? rule.rule.replace("CancellationPolicy:", "") : null;
  }
}

export default PropertyRepository;
