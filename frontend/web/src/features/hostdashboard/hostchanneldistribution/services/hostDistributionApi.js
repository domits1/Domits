// Mock of the host self-distribution routes from design note #3954, section 6, until Enes's backend
// exists. Every function matches one route (name, params, response). Swapping to the real routes
// means changing the bodies in this file only; the hooks and components do not change.
//
// Routes (all under /integrations/channex, Cognito-authenticated):
//   getHostListings()          GET  /host/listings
//   createConnectSession({ propertyId })  POST /host/listings/{propertyId}/connect-session
//   refreshChannels({ propertyId })  POST /host/listings/{propertyId}/channels/refresh
// enableDistribution and disconnectChannel arrive with the pull requests that use them.

// While false, the Distribution tab shows none of this, so a real host never sees invented data.
// Flip to true only for local preview. Remove the flag when the real routes are wired.
export const MOCK_HOST_DISTRIBUTION_ENABLED = false;

const MOCK_REQUEST_DELAY_MS = 300;

// ---------------------------------------------------------------------------------------------
// RESPONSE SHAPES -- PROPOSED, TO CONFIRM WITH ENES. The design note defines the routes but no
// request or response bodies. Everything the frontend reads is in the fixtures below, so a change
// of shape is a change in this one block (plus utils/distributionStates.js).
//
// listing = {
//   propertyId, title,
//   distribution: { status: "NOT_ENABLED" | "PROVISIONING" | "PROVISIONING_FAILED" | "READY",
//     missing: ["NOT_PUBLISHED" | "MISSING_ADDRESS" | "MISSING_GUESTS" | "MISSING_PRICE"] },
//   timezone: { required, options },                       // used by the timezone picker (PR B)
//   channels: [{
//     channelId, otaCode: "BookingCom" | "Airbnb" | "Vrbo",
//     status: "ACTIVE" | "DISCONNECTING" | "DISCONNECTED" | "ERROR",   // the D7 row status
//     displayState: "SYNCING" | "LIVE" | "DISCONNECTING" | "DISCONNECTED" | "NEEDS_ATTENTION",
//     lastErrorCode, disconnectedOutsideDomits,
//     upcomingBookingCount,                                // used by the disconnect dialog (PR C)
//   }],
// }
// getHostListings  -> { listings: [listing] }
// refreshChannels  -> { listing }                          // the updated listing, so the UI replaces one object
// createConnectSession -> { url, expiresAt }               // a one-time Channex screen address for this listing's
//                                                          // property; errors: 404 LISTING_NOT_FOUND,
//                                                          // 409 DISTRIBUTION_NOT_ENABLED
// errors           -> thrown like requestChannex() throws: Error with .status, .responseBody { error, errorCode }
// ---------------------------------------------------------------------------------------------

const channel = (otaCode, status, displayState, extra = {}) => ({
  channelId: `mock-channel-${otaCode}`,
  otaCode,
  status,
  displayState,
  lastErrorCode: null,
  disconnectedOutsideDomits: false,
  upcomingBookingCount: 0,
  ...extra,
});

const NO_TIMEZONE_CHOICE = { required: false, options: [] };

const createFixtures = () => [
  {
    propertyId: "mock-listing-live",
    title: "Canal House",
    distribution: { status: "READY", missing: [] },
    timezone: NO_TIMEZONE_CHOICE,
    channels: [channel("BookingCom", "ACTIVE", "LIVE"), channel("Airbnb", "ACTIVE", "SYNCING")],
  },
  {
    propertyId: "mock-listing-not-turned-on",
    title: "City Loft",
    distribution: { status: "NOT_ENABLED", missing: [] },
    timezone: NO_TIMEZONE_CHOICE,
    channels: [],
  },
  {
    propertyId: "mock-listing-mixed",
    title: "Harbour Studio",
    distribution: { status: "READY", missing: [] },
    timezone: NO_TIMEZONE_CHOICE,
    channels: [
      channel("BookingCom", "DISCONNECTING", "DISCONNECTING"),
      channel("Airbnb", "DISCONNECTED", "DISCONNECTED"),
      channel("Vrbo", "ERROR", "NEEDS_ATTENTION", { disconnectedOutsideDomits: true }),
    ],
  },
  {
    propertyId: "mock-listing-not-ready",
    title: "Beach Apartment",
    distribution: { status: "NOT_ENABLED", missing: ["MISSING_ADDRESS", "MISSING_PRICE"] },
    timezone: NO_TIMEZONE_CHOICE,
    channels: [],
  },
  {
    propertyId: "mock-listing-setup-failed",
    title: "Windmill Cottage",
    distribution: { status: "PROVISIONING_FAILED", missing: [] },
    timezone: NO_TIMEZONE_CHOICE,
    channels: [],
  },
];

let mockListings = createFixtures();

// For tests: the mock keeps state between calls so a preview session behaves like a backend.
export const resetMockHostDistribution = () => {
  mockListings = createFixtures();
};

const mockDelay = () => new Promise((resolve) => setTimeout(resolve, MOCK_REQUEST_DELAY_MS));

// Callers get copies, so a component that mutates a response cannot change the mock's state.
const copy = (value) => JSON.parse(JSON.stringify(value));

// Shaped like the Error requestChannex() throws on a non-2xx response, so a real network error and a
// mock error are handled the same way by callers.
const buildMockRequestError = ({ endpoint, status, error, errorCode }) => {
  const requestError = new Error(`POST ${endpoint} failed with status ${status}: ${error}`);
  requestError.status = status;
  requestError.endpoint = endpoint;
  requestError.method = "POST";
  requestError.responseBody = { error, errorCode };
  return requestError;
};

const listingNotFoundError = (endpoint) =>
  buildMockRequestError({ endpoint, status: 404, error: "Listing not found.", errorCode: "LISTING_NOT_FOUND" });

export const getHostListings = async () => {
  await mockDelay();
  return { listings: copy(mockListings) };
};

// The mock stands in for "read the channels from Channex": a syncing channel has caught up by the
// time the host refreshes, so Refresh visibly does something in a preview.
export const refreshChannels = async ({ propertyId } = {}) => {
  await mockDelay();

  const found = mockListings.find((listing) => listing.propertyId === propertyId);
  if (!found) throw listingNotFoundError(`/integrations/channex/host/listings/${propertyId}/channels/refresh`);

  found.channels = found.channels.map((candidate) =>
    candidate.displayState === "SYNCING" ? { ...candidate, displayState: "LIVE" } : candidate
  );
  return { listing: copy(found) };
};

const MOCK_CONNECT_SESSION_URL = "https://staging.channex.io/mock-connect?token=mock";
const MOCK_CONNECT_SESSION_LIFETIME_MS = 15 * 60 * 1000;

// The real route requests a one-time token for the listing's own Channex property after the owner
// check, and never takes a property id from the browser. The mock only answers for a listing that
// has been turned on, like the real one will.
export const createConnectSession = async ({ propertyId } = {}) => {
  await mockDelay();

  const endpoint = `/integrations/channex/host/listings/${propertyId}/connect-session`;
  const found = mockListings.find((listing) => listing.propertyId === propertyId);
  if (!found) throw listingNotFoundError(endpoint);
  if (found.distribution.status !== "READY") {
    throw buildMockRequestError({
      endpoint,
      status: 409,
      error: "Distribution is not turned on for this listing.",
      errorCode: "DISTRIBUTION_NOT_ENABLED",
    });
  }

  return { url: MOCK_CONNECT_SESSION_URL, expiresAt: Date.now() + MOCK_CONNECT_SESSION_LIFETIME_MS };
};
