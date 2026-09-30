import {
  CHANNEX_ARI_CHANGE_TYPE,
  CHANNEX_ARI_OUTBOX_SOURCE,
} from "../.shared/channelManagement/utils/channexAriOutboxConstants.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const toIsoDate = (ms) => new Date(ms).toISOString().slice(0, 10);

// The nights a booking blocks run from arrival to the day before departure: the
// checkout day stays bookable. Several stays (old and new dates) become one range.
export const bookingAvailabilityChange = (domitsPropertyId, ...stays) => {
  const valid = stays.filter(
    ({ arrivalMs, departureMs }) => Number.isFinite(arrivalMs) && Number.isFinite(departureMs) && departureMs > arrivalMs
  );
  if (!valid.length) return null;

  return {
    domitsPropertyId,
    changeTypes: [CHANNEX_ARI_CHANGE_TYPE.AVAILABILITY],
    dateFrom: toIsoDate(Math.min(...valid.map(({ arrivalMs }) => arrivalMs))),
    dateTo: toIsoDate(Math.max(...valid.map(({ departureMs }) => departureMs)) - DAY_MS),
    source: CHANNEX_ARI_OUTBOX_SOURCE.BOOKING,
  };
};
