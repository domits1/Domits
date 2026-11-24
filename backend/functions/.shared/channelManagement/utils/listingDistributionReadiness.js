// Whether a listing may turn on distribution to OTAs through Channex (design note D3, #506).
// Pure on purpose: the data layer builds the plain listing, so the rule is testable without a database.

export const READINESS_GAP = Object.freeze({
  NOT_PUBLISHED: "NOT_PUBLISHED",
  MISSING_ADDRESS: "MISSING_ADDRESS",
  MISSING_GUESTS: "MISSING_GUESTS",
  MISSING_PRICE: "MISSING_PRICE",
});

const LIVE_STATUS = "ACTIVE";

// The country is required, not only the row: the timezone step (D4) derives the timezone from it.
const hasAddress = (location) => typeof location?.country === "string" && location.country.trim() !== "";

const isPositiveWholeNumber = (value) => Number.isInteger(value) && value > 0;

const isPositiveNumber = (value) => typeof value === "number" && value > 0;

export const listingDistributionReadiness = ({ status, location, guests, roomRate }) => {
  const missing = [];
  if (status !== LIVE_STATUS) missing.push(READINESS_GAP.NOT_PUBLISHED);
  if (!hasAddress(location)) missing.push(READINESS_GAP.MISSING_ADDRESS);
  if (!isPositiveWholeNumber(guests)) missing.push(READINESS_GAP.MISSING_GUESTS);
  if (!isPositiveNumber(roomRate)) missing.push(READINESS_GAP.MISSING_PRICE);

  return missing.length === 0 ? { ready: true } : { ready: false, missing };
};
