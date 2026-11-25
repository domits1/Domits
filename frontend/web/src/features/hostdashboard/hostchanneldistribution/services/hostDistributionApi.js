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
// "success" | "in-progress" | "timezone-required" | "not-ready" | "try-again". Each error outcome
// also stores the state a real backend would leave behind, so reading the listings again shows it.
// "try-again" answers once, then the next turn-on resumes and succeeds, as in the contract.
export const MOCK_ENABLE_OUTCOME = "success";

const MOCK_REQUEST_DELAY_MS = 300;

// ---------------------------------------------------------------------------------------------
// RESPONSE SHAPES -- Enes's contract for the host distribution routes. Everything the frontend
// reads is in the fixtures below, so a change of shape is a change in this one block (plus
// utils/distributionStates.js).
//
// listing = {
//   propertyId, title,
//   distribution: {
//     status: "NOT_ENABLED" | "PROVISIONING" | "READY",
//     missing: ["NOT_PUBLISHED" | "MISSING_ADDRESS" | "MISSING_GUESTS" | "MISSING_PRICE"],
//     timezone: { required, options },                     // IANA ids, for the timezone picker (PR B)
//   },
//   channels: [{
//     otaCode: "BookingCom" | "Airbnb" | "Vrbo",
//     label: "LIVE" | "SYNCING" | "DISCONNECTED" | "UNKNOWN",  // UNKNOWN: Channex did not answer
//            // DISCONNECTING and NEEDS_ATTENTION are not in the contract; only the mock of #4007 uses them
//   }],
// }
// getHostListings  -> { listings: [listing] }
// refreshChannels  -> { listing }                          // the same shape as one listing above; it replaces that listing
// enableDistribution({ propertyId, chosenTimezone }) -> { status: "PROVISIONED" | "ALREADY_CONNECTED" }
//                                                          // chosenTimezone only where distribution.timezone.required;
//                                                          // the host then reads the listings again. A listing that is
//                                                          // PROVISIONING is resumed. Errors, decided by errorCode:
//                                                          // 404 DISTRIBUTION_LISTING_NOT_FOUND, 403 ..._NOT_OWNED,
//                                                          // 422 DISTRIBUTION_LISTING_NOT_READY (+ missing),
//                                                          // 422 DISTRIBUTION_TIMEZONE_CHOICE_NEEDED, ..._INVALID_CHOICE
//                                                          // (+ options), ..._UNKNOWN_COUNTRY,
//                                                          // 409 DISTRIBUTION_ALREADY_IN_PROGRESS, ..._NEEDS_ATTENTION,
//                                                          // ..._OWN_CHANNEX_ACCOUNT (no re-read),
//                                                          // 503 DISTRIBUTION_TRY_AGAIN, ..._NOT_CONFIGURED,
//                                                          // 502 DISTRIBUTION_CHANNEX_REFUSED (+ validationDetails)
// createConnectSession -> { iframeUrl, expiresInSeconds }  // a one-time Channex screen address for this listing;
//                                                          // errors: 404 DISTRIBUTION_LISTING_NOT_FOUND,
//                                                          // 409 DISTRIBUTION_NOT_TURNED_ON
// errors           -> thrown like requestChannex() throws: Error with .status, .responseBody { error, errorCode }
// ---------------------------------------------------------------------------------------------

const channel = (otaCode, label) => ({ otaCode, label });

const NO_TIMEZONE_CHOICE = { required: false, options: [] };
// Indonesia has several timezones, so it is one of the countries where the host picks (D4).
const INDONESIA_TIMEZONE_CHOICE = { required: true, options: ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"] };

const createFixtures = () => [
  {
    propertyId: "mock-listing-live",
    title: "Canal House",
    distribution: { status: "READY", missing: [], timezone: NO_TIMEZONE_CHOICE },
    channels: [channel("BookingCom", "LIVE"), channel("Airbnb", "SYNCING")],
  },
  {
    propertyId: "mock-listing-not-turned-on",
    title: "City Loft",
    distribution: { status: "NOT_ENABLED", missing: [], timezone: NO_TIMEZONE_CHOICE },
    channels: [],
  },
  {
    propertyId: "mock-listing-mixed",
    title: "Harbour Studio",
    distribution: { status: "READY", missing: [], timezone: NO_TIMEZONE_CHOICE },
    channels: [
      channel("BookingCom", "DISCONNECTING"),
      channel("Airbnb", "DISCONNECTED"),
      channel("Vrbo", "NEEDS_ATTENTION"),
    ],
  },
  {
    propertyId: "mock-listing-not-ready",
    title: "Beach Apartment",
    distribution: {
      status: "NOT_ENABLED",
      missing: ["MISSING_ADDRESS", "MISSING_PRICE"],
      timezone: NO_TIMEZONE_CHOICE,
    },
    channels: [],
  },
  {
    propertyId: "mock-listing-needs-timezone",
    title: "Ubud Retreat",
    distribution: { status: "NOT_ENABLED", missing: [], timezone: INDONESIA_TIMEZONE_CHOICE },
    channels: [],
  },
  {
    propertyId: "mock-listing-provisioning",
    title: "Lighthouse Cabin",
    distribution: { status: "PROVISIONING", missing: [], timezone: NO_TIMEZONE_CHOICE },
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
const buildMockRequestError = ({ endpoint, status, error, errorCode, ...extra }) => {
  const requestError = new Error(`POST ${endpoint} failed with status ${status}: ${error}`);
  requestError.status = status;
  requestError.endpoint = endpoint;
  requestError.method = "POST";
  requestError.responseBody = { error, errorCode, ...extra };
  return requestError;
};

const listingNotFoundError = (endpoint) =>
  buildMockRequestError({
    endpoint,
    status: 404,
    error: "Listing not found.",
    errorCode: "DISTRIBUTION_LISTING_NOT_FOUND",
  });

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
    candidate.label === "SYNCING" ? { ...candidate, label: "LIVE" } : candidate
  );
  return { listing: copy(found) };
};

// Leaves behind what a real backend would, for the outcomes that change the listing, so the
// Refresh that follows an error shows it.
const storeForcedEnableOutcome = (found) => {
  if (mockEnableOutcome === "in-progress" || mockEnableOutcome === "try-again") {
    found.distribution.status = "PROVISIONING";
  }
  if (mockEnableOutcome === "not-ready") found.distribution.missing = ["MISSING_PRICE"];
  if (mockEnableOutcome === "timezone-required") found.distribution.timezone = INDONESIA_TIMEZONE_CHOICE;
};

// Turns distribution on for a listing (D2, D3, D4). Idempotent like the real route: a listing that
// is already READY answers ALREADY_CONNECTED, and one that is still PROVISIONING is resumed.
export const enableDistribution = async ({ propertyId, chosenTimezone } = {}) => {
  await mockDelay();

  const endpoint = `/integrations/channex/host/listings/${propertyId}/distribution`;
  const found = mockListings.find((listing) => listing.propertyId === propertyId);
  if (!found) throw listingNotFoundError(endpoint);
  if (found.distribution.status === "READY") return { status: "ALREADY_CONNECTED" };

  storeForcedEnableOutcome(found);

  if (found.distribution.missing.length > 0) {
    throw buildMockRequestError({
      endpoint,
      status: 422,
      error: "The listing is not ready for distribution.",
      errorCode: "DISTRIBUTION_LISTING_NOT_READY",
      missing: found.distribution.missing,
    });
  }
  const { required, options } = found.distribution.timezone;
  if (required && !chosenTimezone) {
    throw buildMockRequestError({
      endpoint,
      status: 422,
      error: "Choose a timezone for this listing.",
      errorCode: "DISTRIBUTION_TIMEZONE_CHOICE_NEEDED",
      options,
    });
  }
  if (required && !options.includes(chosenTimezone)) {
    throw buildMockRequestError({
      endpoint,
      status: 422,
      error: "That timezone is not available for this listing.",
      errorCode: "DISTRIBUTION_TIMEZONE_INVALID_CHOICE",
      options,
    });
  }
  if (mockEnableOutcome === "in-progress") {
    throw buildMockRequestError({
      endpoint,
      status: 409,
      error: "Distribution is already being set up for this listing.",
      errorCode: "DISTRIBUTION_ALREADY_IN_PROGRESS",
    });
  }
  if (mockEnableOutcome === "try-again") {
    mockEnableOutcome = "success";
    throw buildMockRequestError({
      endpoint,
      status: 503,
      error: "Setting up did not finish. Turn it on again to continue.",
      errorCode: "DISTRIBUTION_TRY_AGAIN",
    });
  }
  found.distribution = { ...found.distribution, status: "READY", timezone: NO_TIMEZONE_CHOICE };
  return { status: "PROVISIONED" };
};

const MOCK_CONNECT_SESSION_URL = "https://staging.channex.io/mock-connect?token=mock";
const MOCK_CONNECT_SESSION_LIFETIME_SECONDS = 900;

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
      errorCode: "DISTRIBUTION_NOT_TURNED_ON",
    });
  }

  return { iframeUrl: MOCK_CONNECT_SESSION_URL, expiresInSeconds: MOCK_CONNECT_SESSION_LIFETIME_SECONDS };
};
