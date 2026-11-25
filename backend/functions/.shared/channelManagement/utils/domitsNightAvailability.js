import { normalizeValueToCalendarInt } from "./channexAriDateUtils.js";

export const getEffectiveAvailability = ({ override, isAvailableFromWindows }) => {
  if (override?.isAvailable === null || override?.isAvailable === undefined) {
    return isAvailableFromWindows;
  }
  return override.isAvailable;
};

export const normalizeAvailabilityWindows = (availabilityWindows) =>
  (Array.isArray(availabilityWindows) ? availabilityWindows : [])
    .map((entry) => ({
      availableStartDate: normalizeValueToCalendarInt(entry?.availableStartDate),
      availableEndDate: normalizeValueToCalendarInt(entry?.availableEndDate),
    }))
    .filter((entry) => entry.availableStartDate && entry.availableEndDate);

export const buildBookingAwareAvailability = ({ baseAvailability, activeBookingCount, sellableUnitCount }) => {
  const availableUnitCount = baseAvailability
    ? Math.max(0, sellableUnitCount - Math.max(0, activeBookingCount))
    : 0;

  return {
    baseAvailability,
    activeBookingCount,
    sellableUnitCount,
    availableUnitCount,
    availability: availableUnitCount > 0,
  };
};
