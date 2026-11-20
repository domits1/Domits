// Mock of the host self-distribution routes from design note #3954, section 6, until Enes's backend
// exists. Every function matches one route (name, params, response). Swapping to the real routes
// means changing the bodies in this file only; the hooks and components do not change.
//
// Routes (all under /integrations/channex, Cognito-authenticated):
//   getHostListings()          GET  /host/listings
//   enableDistribution({ propertyId, timezone })  POST /host/listings/{propertyId}/distribution
//   createConnectSession({ propertyId })  POST /host/listings/{propertyId}/connect-session
//   refreshChannels({ propertyId })  POST /host/listings/{propertyId}/channels/refresh
// disconnectChannel arrives with the pull request that uses it.

// While false, the Distribution tab shows none of this, so a real host never sees invented data.
// Flip to true only for local preview. Remove the flag when the real routes are wired.
export const MOCK_HOST_DISTRIBUTION_ENABLED = false;

// What enableDistribution answers, to preview each error without a backend:
// "success" | "in-progress" | "timezone-required" | "not-ready" | "failed". Each error outcome also
// stores the state a real backend would leave behind, so Refresh then shows it.
export const MOCK_ENABLE_OUTCOME = "success";

const MOCK_REQUEST_DELAY_MS = 300;

// ---------------------------------------------------------------------------------------------
// RESPONSE SHAPES -- PROPOSED, TO CONFIRM WITH ENES. The design note defines the routes but no
// request or response bodies. Everything the frontend reads is in the fixtures below, so a change
// of shape is a change in this one block (plus utils/distributionStates.js).
//
// listing = {
//   propertyId, title,
//   readiness: { ready, missing: ["STATUS_NOT_ACTIVE" | "LOCATION_MISSING" | "MAX_GUESTS_MISSING" | "PRICE_MISSING"] },
//   distribution: { status: "NOT_ENABLED" | "PROVISIONING" | "PROVISIONING_FAILED" | "READY" },
//   timezone: { required, options },                       // options are IANA ids, e.g. "Asia/Jakarta"; the
//                                                          // host picks one only where required (D4)
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
// enableDistribution -> { listing }                      // idempotent (D2): a listing that is already READY comes
//                                                          // back unchanged. The body carries timezone only where
//                                                          // the listing requires it. Errors: 400 TIMEZONE_REQUIRED,
//                                                          // 404 LISTING_NOT_FOUND, 409 PROVISIONING_IN_PROGRESS,
//                                                          // 422 LISTING_NOT_READY, 500 PROVISIONING_FAILED (the next
//                                                          // attempt resumes, D2). The error codes are proposed.
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

const READY = { ready: true, missing: [] };
const NO_TIMEZONE_CHOICE = { required: false, options: [] };
// Indonesia has several timezones, so it is one of the countries where the host picks (D4).
const INDONESIA_TIMEZONE_CHOICE = { required: true, options: ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"] };

const createFixtures = () => [
  {
    propertyId: "mock-listing-live",
    title: "Canal House",
    readiness: READY,
    distribution: { status: "READY" },
    timezone: NO_TIMEZONE_CHOICE,
    channels: [channel("BookingCom", "ACTIVE", "LIVE"), channel("Airbnb", "ACTIVE", "SYNCING")],
  },
  {
    propertyId: "mock-listing-not-turned-on",
    title: "City Loft",
    readiness: READY,
    distribution: { status: "NOT_ENABLED" },
    timezone: NO_TIMEZONE_CHOICE,
    channels: [],
  },
  {
    propertyId: "mock-listing-mixed",
    title: "Harbour Studio",
    readiness: READY,
    distribution: { status: "READY" },
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
    readiness: { ready: false, missing: ["LOCATION_MISSING", "PRICE_MISSING"] },
    distribution: { status: "NOT_ENABLED" },
    timezone: NO_TIMEZONE_CHOICE,
    channels: [],
  },
  {
    propertyId: "mock-listing-setup-failed",
    title: "Windmill Cottage",
    readiness: READY,
    distribution: { status: "PROVISIONING_FAILED" },
    timezone: NO_TIMEZONE_CHOICE,
    channels: [],
  },
  {
    propertyId: "mock-listing-needs-timezone",
    title: "Ubud Retreat",
    readiness: READY,
    distribution: { status: "NOT_ENABLED" },
    timezone: INDONESIA_TIMEZONE_CHOICE,
    channels: [],
  },
  {
    propertyId: "mock-listing-provisioning",
    title: "Lighthouse Cabin",
    readiness: READY,
    distribution: { status: "PROVISIONING" },
    timezone: NO_TIMEZONE_CHOICE,
    channels: [],
  },
];

let mockListings = createFixtures();
let mockEnableOutcome = MOCK_ENABLE_OUTCOME;

// For tests: the mock keeps state between calls so a preview session behaves like a backend.
export const resetMockHostDistribution = () => {
  mockListings = createFixtures();
  mockEnableOutcome = MOCK_ENABLE_OUTCOME;
};

// For tests: the outcome the next enableDistribution calls answer with.
export const setMockEnableOutcome = (outcome) => {
  mockEnableOutcome = outcome;
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
// time the host refreshes, and a listing that was still provisioning has finished, so Refresh
// visibly does something in a preview.
export const refreshChannels = async ({ propertyId } = {}) => {
  await mockDelay();

  const found = mockListings.find((listing) => listing.propertyId === propertyId);
  if (!found) throw listingNotFoundError(`/integrations/channex/host/listings/${propertyId}/channels/refresh`);

  if (found.distribution.status === "PROVISIONING") found.distribution = { status: "READY" };
  found.channels = found.channels.map((candidate) =>
    candidate.displayState === "SYNCING" ? { ...candidate, displayState: "LIVE" } : candidate
  );
  return { listing: copy(found) };
};

// Leaves behind what a real backend would, for the outcomes that change the listing, so the
// Refresh that follows an error shows it.
const storeForcedEnableOutcome = (found) => {
  if (mockEnableOutcome === "in-progress") found.distribution = { status: "PROVISIONING" };
  if (mockEnableOutcome === "not-ready") found.readiness = { ready: false, missing: ["PRICE_MISSING"] };
  if (mockEnableOutcome === "timezone-required") found.timezone = INDONESIA_TIMEZONE_CHOICE;
};

// Turns distribution on for a listing (D2, D3, D4). Idempotent like the real route: a listing that
// is already READY comes back unchanged, and one that failed halfway is simply tried again.
export const enableDistribution = async ({ propertyId, timezone } = {}) => {
  await mockDelay();

  const endpoint = `/integrations/channex/host/listings/${propertyId}/distribution`;
  const found = mockListings.find((listing) => listing.propertyId === propertyId);
  if (!found) throw listingNotFoundError(endpoint);
  if (found.distribution.status === "READY") return { listing: copy(found) };

  storeForcedEnableOutcome(found);

  if (!found.readiness.ready) {
    throw buildMockRequestError({
      endpoint,
      status: 422,
      error: "The listing is not ready for distribution.",
      errorCode: "LISTING_NOT_READY",
    });
  }
  if (found.distribution.status === "PROVISIONING") {
    throw buildMockRequestError({
      endpoint,
      status: 409,
      error: "Distribution is already being set up for this listing.",
      errorCode: "PROVISIONING_IN_PROGRESS",
    });
  }
  if (found.timezone.required && !found.timezone.options.includes(timezone)) {
    throw buildMockRequestError({
      endpoint,
      status: 400,
      error: "Choose a timezone for this listing.",
      errorCode: "TIMEZONE_REQUIRED",
    });
  }
  if (mockEnableOutcome === "failed") {
    found.distribution = { status: "PROVISIONING_FAILED" };
    throw buildMockRequestError({
      endpoint,
      status: 500,
      error: "Setting up distribution failed.",
      errorCode: "PROVISIONING_FAILED",
    });
  }

  found.distribution = { status: "READY" };
  found.timezone = NO_TIMEZONE_CHOICE;
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
