import { CHANNEX_ARI_CHANGE_TYPE } from "./channexAriOutboxConstants.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const toIsoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
// The nights a booking blocks run from arrival to the day before departure: the
// checkout day stays bookable. A stay without a whole night blocks nothing.
export const bookingAvailabilityChange = (domitsPropertyId, source, { arrivalMs, departureMs }) => {
  if (!Number.isFinite(arrivalMs) || !Number.isFinite(departureMs)) return null;
  const dateFrom = toIsoDate(arrivalMs);
  const dateTo = toIsoDate(departureMs - DAY_MS);
  if (dateTo < dateFrom) return null;

  return {
    domitsPropertyId,
    changeTypes: [CHANNEX_ARI_CHANGE_TYPE.AVAILABILITY],
    dateFrom,
    dateTo,
    source,
  };
};
