// Mock of the host self-distribution routes from design note #3954, section 6, until Enes's backend
// exists. Every function matches one route (name, params, response). Swapping to the real routes
// means changing the bodies in this file only; the hooks and components do not change.
//
// Routes (all under /integrations/channex, Cognito-authenticated):
//   getHostListings()          GET  /host/listings
//   refreshChannels({ propertyId })  POST /host/listings/{propertyId}/channels/refresh
// enableDistribution, createConnectSession and disconnectChannel arrive with the pull requests
// that use them.

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
//   readiness: { ready, missing: ["STATUS_NOT_ACTIVE" | "LOCATION_MISSING" | "MAX_GUESTS_MISSING" | "PRICE_MISSING"] },
//   distribution: { status: "NOT_ENABLED" | "PROVISIONING" | "PROVISIONING_FAILED" | "READY" },
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
];

let mockListings = createFixtures();

// For tests: the mock keeps state between calls so a preview session behaves like a backend.
export const resetMockHostDistribution = () => {
  mockListings = createFixtures();
};

const mockDelay = () => new Promise((resolve) => setTimeout(resolve, MOCK_REQUEST_DELAY_MS));

// Callers get copies, so a component that mutates a response cannot change the mock's state.
const copy = (value) => JSON.parse(JSON.stringify(value));

export const getHostListings = async () => {
  await mockDelay();
  return { listings: copy(mockListings) };
};

// The mock stands in for "read the channels from Channex": a syncing channel has caught up by the
// time the host refreshes, so Refresh visibly does something in a preview.
export const refreshChannels = async ({ propertyId } = {}) => {
  await mockDelay();

  const found = mockListings.find((listing) => listing.propertyId === propertyId);
  if (!found) {
    const endpoint = `/integrations/channex/host/listings/${propertyId}/channels/refresh`;
    const error = new Error(`POST ${endpoint} failed with status 404: Listing not found.`);
    error.status = 404;
    error.endpoint = endpoint;
    error.method = "POST";
    error.responseBody = { error: "Listing not found.", errorCode: "LISTING_NOT_FOUND" };
    throw error;
  }

  found.channels = found.channels.map((candidate) =>
    candidate.displayState === "SYNCING" ? { ...candidate, displayState: "LIVE" } : candidate
  );
  return { listing: copy(found) };
};
