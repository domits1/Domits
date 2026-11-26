import * as realApi from "./hostDistributionRealApi";

// Mock of the host self-distribution routes from design note #3954, section 6, until Enes's backend
// exists. Every function matches one route (name, params, response). Swapping to the real routes
// means changing the bodies in this file only; the hooks and components do not change.
//
// Routes (all under /integrations/channex, Cognito-authenticated):
//   getHostListings()          GET  /host/listings
//   enableDistribution({ propertyId, chosenTimezone })  POST /host/listings/{propertyId}/distribution
//   createConnectSession({ propertyId })  POST /host/listings/{propertyId}/connect-session
//   refreshChannels({ propertyId })  POST /host/listings/{propertyId}/channels/refresh
//   disconnectChannel({ channelId })  POST /host/channels/{channelId}/disconnect   (NOT IN THE CONTRACT YET)

// One switch picks real or mock: REACT_APP_REAL_DISTRIBUTION=true calls the real routes and shows the
// cards. Anything else keeps the mock and hides the cards, so a real host never sees invented data and
// Jest never reaches the network. disconnectChannel stays mock until its route exists.
export const USE_REAL_HOST_DISTRIBUTION_API = process.env.REACT_APP_REAL_DISTRIBUTION === "true";
export const MOCK_HOST_DISTRIBUTION_ENABLED = USE_REAL_HOST_DISTRIBUTION_API;

// What enableDistribution answers, to preview each error without a backend:
// "success" | "in-progress" | "timezone-required" | "not-ready" | "try-again". Each error outcome
// also stores the state a real backend would leave behind, so reading the listings again shows it.
// "try-again" answers once, then the next turn-on resumes and succeeds, as in the contract.
export const MOCK_ENABLE_OUTCOME = "success";

// What disconnectChannel answers, the same way: "success" | "in-progress" | "not-found" | "failed".
// "in-progress" stores DISCONNECTING, "not-found" removes the channel, and "failed" stores ERROR, so
// the Refresh after the error shows what a backend would have left behind.
export const MOCK_DISCONNECT_OUTCOME = "success";

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
//     // NOT IN THE CONTRACT YET: disconnect has no route, so its mock also uses the labels DISCONNECTING and
//     // NEEDS_ATTENTION and keeps these on every channel (see MOCK_ONLY_CHANNEL_FIELDS). They go when the
//     // real disconnect route is wired.
//     channelId, status: "ACTIVE" | "DISCONNECTING" | "DISCONNECTED" | "ERROR", lastErrorCode,
//     disconnectedOutsideDomits, upcomingBookingCount,
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
// disconnectChannel -> { listing }                       // NOT IN THE CONTRACT YET. Answers at once (D5): the channel
//                                                          // is DISCONNECTING and a worker finishes it about a minute
//                                                          // later, so Refresh later shows DISCONNECTED. Idempotent: a
//                                                          // channel that is already DISCONNECTED comes back unchanged.
//                                                          // Errors: 404 CHANNEL_NOT_FOUND, 409 DISCONNECT_IN_PROGRESS,
//                                                          // 500 DISCONNECT_FAILED. The error codes are proposed.
// createConnectSession -> { iframeUrl, expiresInSeconds }  // a one-time Channex screen address for this listing;
//                                                          // errors: 404 DISTRIBUTION_LISTING_NOT_FOUND,
//                                                          // 409 DISTRIBUTION_NOT_TURNED_ON
// errors           -> thrown like requestChannex() throws: Error with .status, .responseBody { error, errorCode }
// ---------------------------------------------------------------------------------------------

// NOT IN THE CONTRACT YET. The contract sends a channel as { otaCode, label }. Disconnect has no route and
// no channel id, so its mock needs these on every channel. They go when the real route is wired.
export const MOCK_ONLY_CHANNEL_FIELDS = [
  "channelId",
  "status",
  "lastErrorCode",
  "disconnectedOutsideDomits",
  "upcomingBookingCount",
];

const MOCK_STATUS_BY_LABEL = {
  SYNCING: "ACTIVE",
  LIVE: "ACTIVE",
  DISCONNECTING: "DISCONNECTING",
  DISCONNECTED: "DISCONNECTED",
  NEEDS_ATTENTION: "ERROR",
};

// The id is the same for an OTA in every listing unless a fixture gives its own, so a fixture that
// shares an OTA with another one passes channelId.
const channel = (otaCode, label, mockOnly = {}) => ({
  otaCode,
  label,
  channelId: `mock-channel-${otaCode}`,
  status: MOCK_STATUS_BY_LABEL[label],
  lastErrorCode: null,
  disconnectedOutsideDomits: false,
  upcomingBookingCount: 0,
  ...mockOnly,
});

const NO_TIMEZONE_CHOICE = { required: false, options: [] };
// Indonesia has several timezones, so it is one of the countries where the host picks (D4).
const INDONESIA_TIMEZONE_CHOICE = { required: true, options: ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"] };

const createFixtures = () => [
  {
    propertyId: "mock-listing-live",
    title: "Canal House",
    distribution: { status: "READY", missing: [], timezone: NO_TIMEZONE_CHOICE },
    channels: [
      channel("BookingCom", "LIVE", { upcomingBookingCount: 2 }),
      channel("Airbnb", "SYNCING", { upcomingBookingCount: 1 }),
    ],
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
      channel("BookingCom", "DISCONNECTING", { channelId: "mock-channel-mixed-BookingCom" }),
      channel("Airbnb", "DISCONNECTED", { channelId: "mock-channel-mixed-Airbnb" }),
      channel("Vrbo", "NEEDS_ATTENTION", {
        channelId: "mock-channel-mixed-Vrbo",
        disconnectedOutsideDomits: true,
        upcomingBookingCount: 3,
      }),
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
let mockDisconnectOutcome = MOCK_DISCONNECT_OUTCOME;

// For tests: the mock keeps state between calls so a preview session behaves like a backend.
export const resetMockHostDistribution = () => {
  mockListings = createFixtures();
  mockEnableOutcome = MOCK_ENABLE_OUTCOME;
  mockDisconnectOutcome = MOCK_DISCONNECT_OUTCOME;
};

// For tests: the outcome the next disconnectChannel calls answer with.
export const setMockDisconnectOutcome = (outcome) => {
  mockDisconnectOutcome = outcome;
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

const mockGetHostListings = async () => {
  await mockDelay();
  return { listings: copy(mockListings) };
};

// The mock stands in for "read the channels from Channex": a syncing channel has caught up by the
// time the host refreshes, and a channel that was being disconnected is done (the worker needs about a
// minute, D5), so Refresh visibly does something in a preview.
const finishPendingChannel = (candidate) => {
  if (candidate.label === "SYNCING") return { ...candidate, label: "LIVE" };
  if (candidate.label === "DISCONNECTING") return { ...candidate, status: "DISCONNECTED", label: "DISCONNECTED" };
  return candidate;
};

const mockRefreshChannels = async ({ propertyId } = {}) => {
  await mockDelay();

  const found = mockListings.find((listing) => listing.propertyId === propertyId);
  if (!found) throw listingNotFoundError(`/integrations/channex/host/listings/${propertyId}/channels/refresh`);

  found.channels = found.channels.map(finishPendingChannel);
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
const mockEnableDistribution = async ({ propertyId, chosenTimezone } = {}) => {
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

const channelNotFoundError = (endpoint) =>
  buildMockRequestError({ endpoint, status: 404, error: "Channel not found.", errorCode: "CHANNEL_NOT_FOUND" });

const findChannel = (channelId) => {
  for (const listing of mockListings) {
    const found = listing.channels.find((candidate) => candidate.channelId === channelId);
    if (found) return { listing, channel: found };
  }
  return null;
};

// Leaves behind what a real backend would, so the Refresh that follows an error shows it.
const storeForcedDisconnectOutcome = ({ listing, channel: forced }) => {
  if (mockDisconnectOutcome === "in-progress") {
    Object.assign(forced, { status: "DISCONNECTING", label: "DISCONNECTING" });
  }
  if (mockDisconnectOutcome === "failed") {
    Object.assign(forced, { status: "ERROR", label: "NEEDS_ATTENTION", lastErrorCode: "DISCONNECT_FAILED" });
  }
  if (mockDisconnectOutcome === "not-found") {
    listing.channels = listing.channels.filter((candidate) => candidate !== forced);
  }
};

// Turns one OTA connection off (D5). Like the real route it answers at once with the channel
// DISCONNECTING; a Refresh later shows it DISCONNECTED. A channel that is already off comes back
// unchanged, so a double click or a second tab is harmless.
export const disconnectChannel = async ({ channelId } = {}) => {
  await mockDelay();

  const endpoint = `/integrations/channex/host/channels/${channelId}/disconnect`;
  const match = findChannel(channelId);
  if (!match) throw channelNotFoundError(endpoint);
  if (match.channel.status === "DISCONNECTED") return { listing: copy(match.listing) };

  storeForcedDisconnectOutcome(match);

  if (mockDisconnectOutcome === "not-found") throw channelNotFoundError(endpoint);
  if (match.channel.status === "DISCONNECTING") {
    throw buildMockRequestError({
      endpoint,
      status: 409,
      error: "This channel is already being disconnected.",
      errorCode: "DISCONNECT_IN_PROGRESS",
    });
  }
  if (mockDisconnectOutcome === "failed") {
    throw buildMockRequestError({
      endpoint,
      status: 500,
      error: "Turning off the channel failed.",
      errorCode: "DISCONNECT_FAILED",
    });
  }

  Object.assign(match.channel, { status: "DISCONNECTING", label: "DISCONNECTING" });
  return { listing: copy(match.listing) };
};

const MOCK_CONNECT_SESSION_URL = "https://staging.channex.io/mock-connect?token=mock";
const MOCK_CONNECT_SESSION_LIFETIME_SECONDS = 900;

// The real route requests a one-time token for the listing's own Channex property after the owner
// check, and never takes a property id from the browser. The mock only answers for a listing that
// has been turned on, like the real one will.
const mockCreateConnectSession = async ({ propertyId } = {}) => {
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

export const getHostListings = USE_REAL_HOST_DISTRIBUTION_API ? realApi.getHostListings : mockGetHostListings;
export const refreshChannels = USE_REAL_HOST_DISTRIBUTION_API ? realApi.refreshChannels : mockRefreshChannels;
export const enableDistribution = USE_REAL_HOST_DISTRIBUTION_API
  ? realApi.enableDistribution
  : mockEnableDistribution;
export const createConnectSession = USE_REAL_HOST_DISTRIBUTION_API
  ? realApi.createConnectSession
  : mockCreateConnectSession;
