import {
  CHANNEX_ARI_CHANGE_TYPE,
  CHANNEX_ARI_OUTBOX_SOURCE,
} from "../.shared/channelManagement/utils/channexAriOutboxConstants.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const toIsoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
// ISO dates sort correctly as text.
const byText = (left, right) => left.localeCompare(right);

// The nights a booking blocks run from arrival to the day before departure: the
// checkout day stays bookable. A stay without a whole night blocks nothing, and
// several stays (old and new dates) become one range.
export const bookingAvailabilityChange = (domitsPropertyId, ...stays) => {
  const nights = stays
    .filter(({ arrivalMs, departureMs }) => Number.isFinite(arrivalMs) && Number.isFinite(departureMs))
    .map(({ arrivalMs, departureMs }) => ({ from: toIsoDate(arrivalMs), to: toIsoDate(departureMs - DAY_MS) }))
    .filter(({ from, to }) => from <= to);
  if (!nights.length) return null;

  return {
    domitsPropertyId,
    changeTypes: [CHANNEX_ARI_CHANGE_TYPE.AVAILABILITY],
    dateFrom: nights.map(({ from }) => from).sort(byText)[0],
    dateTo: nights.map(({ to }) => to).sort(byText).at(-1),
    source: CHANNEX_ARI_OUTBOX_SOURCE.BOOKING,
  };
};
