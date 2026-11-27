// The real host self-distribution routes. They answer with the same shapes the mock in
// hostDistributionApi.js does, so hooks and components do not change. Errors are the ones
// requestChannex() throws: Error with .status and .responseBody { error, errorCode }.
import { requestChannex } from "../../hostintegrations/channexApi";

const NO_TIMEZONE_CHOICE = { required: false, options: [] };

// The backend sends readiness.missing and timezone at the top level of a listing; the frontend reads them
// from listing.distribution. Both shapes are accepted, and a value already inside distribution wins, so
// this keeps working if the backend moves the fields.
export const normalizeListing = (listing) => {
  if (!listing || typeof listing !== "object") return listing;
  const distribution = listing.distribution ?? {};
  return {
    ...listing,
    distribution: {
      ...distribution,
      missing: distribution.missing ?? listing.readiness?.missing ?? [],
      timezone: distribution.timezone ?? listing.timezone ?? NO_TIMEZONE_CHOICE,
    },
  };
};

const listingPath = (propertyId, suffix) =>
  `/integrations/channex/host/listings/${encodeURIComponent(propertyId)}/${suffix}`;

export const getHostListings = async () => {
  const answer = await requestChannex("/integrations/channex/host/listings");
  // A missing list is left as it is: the caller decides what an answer without a list means.
  return Array.isArray(answer?.listings) ? { ...answer, listings: answer.listings.map(normalizeListing) } : answer;
};

export const refreshChannels = async ({ propertyId } = {}) => {
  const answer = await requestChannex(listingPath(propertyId, "channels/refresh"), { method: "POST" });
  return answer?.listing ? { ...answer, listing: normalizeListing(answer.listing) } : answer;
};

export const createConnectSession = ({ propertyId } = {}) =>
  requestChannex(listingPath(propertyId, "connect-session"), { method: "POST" });
