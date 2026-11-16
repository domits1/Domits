// Data layer for the Distribution tab. getChannexStatus, getMappedProperties and
// getLatestSyncEvidence below call the real backend, read-only, via the existing
// hostintegrations/channexApi.js helpers (which already send Authorization: Bearer <Cognito ID
// token> -- no new fetch code here, and the token is never logged). Every other function stays a
// mock, mirroring the response shape of its matching real endpoint in
// hostintegrations/channexApi.js, until each is wired the same way.
import {
  getChannexStatus as fetchRealChannexStatus,
  getLatestChannexSyncEvidence,
  getLinkedChannexRoomTypes,
} from "../../hostintegrations/channexApi";
import { getAccessToken } from "../../../../services/getAccessToken";
import { fetchListingsFromHostDashboard } from "../../../../services/hostPropertyService";

const HTTP_NOT_FOUND = 404;

// While false, the Distribution tab's "+ Add channel" button stays disabled even when the
// status is NOT_CONNECTED, so a real host can never trigger this mock connect flow. Flip to
// true only for local preview of the connect/reconnect/disconnect modals. Remove this flag
// entirely once connectChannex/disconnectChannex below call the real endpoints.
export const MOCK_CONNECT_FLOW_ENABLED = false;

// While false, the Distribution tab does not show the Property mapping table, which still runs on
// mock data. Its mock function (getPropertyMappingRows) is not called either, so a real host never
// sees invented data next to their real Channex status. The property picker and the Last sync card
// no longer depend on this flag: they read real endpoints. Flip to true only for local preview.
// Remove this flag entirely once the table reads real endpoints.
export const MOCK_PREVIEW_SECTIONS_ENABLED = false;

// Flip these to preview each connect/disconnect modal outcome in the browser (only reachable
// once MOCK_CONNECT_FLOW_ENABLED is true).
const MOCK_CONNECT_OUTCOME = "SUCCESS"; // SUCCESS | REJECTED | ERROR
const MOCK_DISCONNECT_OUTCOME = "SUCCESS"; // SUCCESS | ERROR

const MOCK_REQUEST_DELAY_MS = 500;

const MOCK_INTEGRATION_ACCOUNT_ID = "mock-integration-account-id";

// Property rows for the "Property mapping" table (#2578). Not a mirror of one real endpoint --
// once wired, this will orchestrate GET /property/hostDashboard/all (id/title/location/image/
// guests/bedrooms/bathrooms, per HostListings.js), one getChannexAriTargets call per property
// (ready/missingMappings, per channexMappingService.js), and an availability source still to be
// decided. mapping shape mirrors getChannexAriTargets's real response exactly.
const MOCK_PROPERTY_MAPPING_ROWS = [
  {
    id: "mock-property-1",
    title: "Canal View Loft",
    location: "Amsterdam",
    image: null,
    guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    mapping: { ready: true, missingMappings: [] },
    availableNights: 22,
    totalNights: 30,
    nightlyRate: 145,
  },
  {
    id: "mock-property-2",
    title: "Harbour Studio",
    location: "Rotterdam",
    image: null,
    guests: 2,
    bedrooms: 1,
    bathrooms: 1,
    mapping: { ready: true, missingMappings: [] },
    availableNights: 30,
    totalNights: 30,
    nightlyRate: 89,
  },
  {
    id: "mock-property-3",
    title: "Windmill Cottage",
    location: "Zaanse Schans",
    image: null,
    guests: 6,
    bedrooms: 3,
    bathrooms: 2,
    mapping: {
      ready: false,
      missingMappings: ["PROPERTY_MAPPING_MISSING", "ROOM_TYPE_MAPPING_MISSING", "RATE_PLAN_MAPPING_MISSING"],
    },
    availableNights: 18,
    totalNights: 30,
    nightlyRate: 210,
  },
  {
    id: "mock-property-4",
    title: "City Centre Apartment",
    location: "Utrecht",
    image: null,
    guests: 3,
    bedrooms: 1,
    bathrooms: 1,
    mapping: { ready: false, missingMappings: ["RATE_PLAN_MAPPING_MISSING"] },
    availableNights: 9,
    totalNights: 30,
    nightlyRate: 120,
  },
];

const mockDelay = () => new Promise((resolve) => setTimeout(resolve, MOCK_REQUEST_DELAY_MS));

// Mirrors the masked preview the real backend returns (buildChannexCredentialSummary /
// maskSecret): never the raw key, only a masked tail.
const maskApiKey = (apiKey) => {
  const raw = String(apiKey || "");
  if (raw.length <= 4) return "****";
  return `${"*".repeat(Math.max(4, raw.length - 4))}${raw.slice(-4)}`;
};

// Shaped like the Error requestChannex() throws on a non-2xx response, so a real network error
// and a mock error are handled identically by callers.
const buildMockChannexRequestError = ({ method, endpoint, status, error, errorCode }) => {
  const requestError = new Error(`${method} ${endpoint} failed with status ${status}: ${error}`);
  requestError.status = status;
  requestError.endpoint = endpoint;
  requestError.method = method;
  requestError.responseBody = { error, errorCode };
  return requestError;
};

// Real endpoint: GET /integrations/channex/status. Enes has allowlisted read access for staging
// certification, so this calls through for real; connect/disconnect stay mock (see
// MOCK_CONNECT_FLOW_ENABLED below). No userId: the backend takes the
// user from the Cognito ID token, and sending one would make callers wait for useFetchUser to
// resolve and re-fire the request. channexApi destructures its argument, hence the empty object.
export const getChannexStatus = async () => fetchRealChannexStatus({});

// Real endpoints, both read-only: GET /integrations/channex/linked-room-types, then
// GET /property/hostDashboard/all. A listing is "mapped" when a linked room type points at it.
// The status of a mapping is not checked: the schema defines no status values (open question
// for Enes). Resolves to hostDashboard/all-shaped listings (listing.property.id / .title).
//
// Rejects with the HTTP status on the error, so the caller can tell a 409 (Channex not connected
// or reconnect required, which the status card already explains) from a real failure.
export const getMappedProperties = async () => {
  const { roomTypeMappings } = await getLinkedChannexRoomTypes();
  const mappings = Array.isArray(roomTypeMappings) ? roomTypeMappings : [];
  // A mapping without an id must not count: it would make "nothing linked" look like "something linked".
  const linkedPropertyIds = new Set(mappings.map((mapping) => mapping?.domitsPropertyId).filter(Boolean));
  // Nothing is linked, so there is nothing to join and hostDashboard/all need not be called.
  if (linkedPropertyIds.size === 0) return [];

  const token = getAccessToken();
  if (!token) throw new Error("No access token available to load the host's properties.");

  const { listings, status } = await fetchListingsFromHostDashboard(token);
  // hostDashboard/all answers 404 when the host has no properties at all: an empty list, not an error.
  if (status === HTTP_NOT_FOUND) return [];
  if (!listings) {
    throw Object.assign(new Error(`GET /property/hostDashboard/all failed with status ${status}`), { status });
  }

  return listings.filter((listing) => linkedPropertyIds.has(listing?.property?.id));
};

// Real endpoint, read-only: GET /integrations/channex/sync-evidence/latest?domitsPropertyId=
// domitsPropertyId is required by the endpoint (400 without it), so the tab scopes the latest sync
// to the property picked in the view. No userId: the backend takes the user from the token.
// Resolves to { channel, integrationAccountId, domitsPropertyId, item }, where item is null when
// the property has no evidence yet. Rejects with the HTTP status and body on the error, so the
// caller can tell a 404 CHANNEX_NOT_FOUND (no integration, which the status card explains) from a
// real failure.
export const getLatestSyncEvidence = async ({ domitsPropertyId } = {}) =>
  getLatestChannexSyncEvidence({ domitsPropertyId });

// Not a single real endpoint yet -- see the comment on MOCK_PROPERTY_MAPPING_ROWS above.
export const getPropertyMappingRows = async () => MOCK_PROPERTY_MAPPING_ROWS;

// Real endpoint: POST /integrations/channex/connect ({ credentials: { apiKey }, displayName? }).
// Stays mock: nothing here may call the real connect endpoint. apiKey is only ever read here to
// build a masked preview; it is never stored or logged. Gated unreachable by
// MOCK_CONNECT_FLOW_ENABLED = false above. Since getChannexStatus is now real, this mock no
// longer has any in-memory connection state to advance -- a mock "successful" connect closes the
// modal but the status card, now reading the real backend, simply won't reflect it.
export const connectChannex = async ({ userId, apiKey, displayName } = {}) => {
  await mockDelay();

  if (MOCK_CONNECT_OUTCOME === "ERROR") {
    throw buildMockChannexRequestError({
      method: "POST",
      endpoint: "/integrations/channex/connect",
      status: 503,
      error: "Failed to store Channex credentials in Secrets Manager.",
      errorCode: "CHANNEX_SECRET_STORE_FAILED",
    });
  }

  const connected = MOCK_CONNECT_OUTCOME === "SUCCESS";
  const status = connected ? "CONNECTED" : "VALIDATION_FAILED";
  const now = Date.now();

  return {
    connected,
    channel: "CHANNEX",
    integration: {
      id: MOCK_INTEGRATION_ACCOUNT_ID,
      userId: userId ?? null,
      channel: "CHANNEX",
      externalAccountId: connected ? "mock-external-account-id" : null,
      displayName: displayName || "Channex",
      status,
      lastSuccessfulSyncAt: null,
      lastFailedSyncAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      createdAt: now,
      updatedAt: now,
    },
    credentialsSummary: {
      hasApiKey: true,
      apiKeyMasked: maskApiKey(apiKey),
    },
    validationMode: "PROVIDER_VALIDATION",
    validationState: status,
    providerStatus: connected ? "ACTIVE" : "VALIDATION_FAILED",
    accountPolicy: "SINGLE_ACCOUNT_PER_USER",
    multiAccountDeferred: true,
  };
};

// Real endpoint: POST /integrations/channex/disconnect ({ userId }). Stays mock: nothing here
// may call the real disconnect endpoint. Gated unreachable by MOCK_CONNECT_FLOW_ENABLED = false
// above. Same note as connectChannex: no in-memory connection state left to advance now that
// getChannexStatus is real. The real backend leaves the row's status as DISCONNECTED rather than
// deleting it, which is what the response below mirrors.
export const disconnectChannex = async () => {
  await mockDelay();

  if (MOCK_DISCONNECT_OUTCOME === "ERROR") {
    throw buildMockChannexRequestError({
      method: "POST",
      endpoint: "/integrations/channex/disconnect",
      status: 500,
      error: "Failed to persist Channex disconnect state in Domits.",
      errorCode: "CHANNEX_DISCONNECT_PERSIST_FAILED",
    });
  }

  return {
    disconnected: true,
    channel: "CHANNEX",
    integrationAccountId: MOCK_INTEGRATION_ACCOUNT_ID,
    status: "DISCONNECTED",
    message:
      "Channex integration disconnected in Domits. credentialsRef was cleared on the integration row; the underlying secret is not deleted by this flow.",
  };
};
