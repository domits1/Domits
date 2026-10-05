// Data layer for the Distribution tab. getChannexStatus below calls the real backend, via the
// existing hostintegrations/channexApi.js helper (which already sends Authorization: Bearer
// <Cognito ID token> -- no new fetch code here, and the token is never logged). Every other
// function stays a mock, mirroring the response shape of its matching real endpoint in
// hostintegrations/channexApi.js, until each is wired the same way.
import { getChannexStatus as fetchRealChannexStatus } from "../../hostintegrations/channexApi";

// While false, the Distribution tab's "+ Add channel" button stays disabled even when the
// status is NOT_CONNECTED, so a real host can never trigger this mock connect flow. Flip to
// true only for local preview of the connect/reconnect/disconnect modals. Remove this flag
// entirely once connectChannex/disconnectChannex below call the real endpoints.
export const MOCK_CONNECT_FLOW_ENABLED = false;

// Flip this to preview each "last sync" state in the browser.
const MOCK_CHANNEX_SYNC_STATE = "NONE";
// NONE | SUCCESS | FAILED

// Flip these to preview each connect/disconnect modal outcome in the browser (only reachable
// once MOCK_CONNECT_FLOW_ENABLED is true).
const MOCK_CONNECT_OUTCOME = "SUCCESS"; // SUCCESS | REJECTED | ERROR
const MOCK_DISCONNECT_OUTCOME = "SUCCESS"; // SUCCESS | ERROR

const MOCK_REQUEST_DELAY_MS = 500;

const MOCK_INTEGRATION_ACCOUNT_ID = "mock-integration-account-id";
const MOCK_DOMITS_PROPERTY_ID = "mock-domits-property-id";

// Shaped like GET /integrations/channex/sync-evidence/latest.
// See backend/functions/.shared/channelManagement/services/channexDiagnosticsService.js,
// getLatestChannexSyncEvidenceSummary / formatChannexEvidenceLatestSummary.
const MOCK_SYNC_EVIDENCE_BY_STATE = {
  NONE: {
    channel: "CHANNEX",
    integrationAccountId: MOCK_INTEGRATION_ACCOUNT_ID,
    domitsPropertyId: MOCK_DOMITS_PROPERTY_ID,
    item: null,
  },
  SUCCESS: {
    channel: "CHANNEX",
    integrationAccountId: MOCK_INTEGRATION_ACCOUNT_ID,
    domitsPropertyId: MOCK_DOMITS_PROPERTY_ID,
    item: {
      id: "mock-evidence-success",
      syncType: "ari",
      status: "SUCCESS",
      overallSuccess: true,
      startedAt: 1758700000000,
      finishedAt: 1758700005000,
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
      taskIds: ["mock-task-1"],
      warningCount: 0,
      errorCount: 0,
      providerCalled: true,
      notesSummary: [],
    },
  },
  FAILED: {
    channel: "CHANNEX",
    integrationAccountId: MOCK_INTEGRATION_ACCOUNT_ID,
    domitsPropertyId: MOCK_DOMITS_PROPERTY_ID,
    item: {
      id: "mock-evidence-failed",
      syncType: "ari",
      status: "FAILED",
      overallSuccess: false,
      startedAt: 1758700100000,
      finishedAt: 1758700102000,
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
      taskIds: [],
      warningCount: 1,
      errorCount: 2,
      providerCalled: true,
      notesSummary: ["Rate plan mapping missing for one room type."],
    },
  },
};

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
// certification, so this calls through for real; connect/disconnect/sync stay mock (see
// MOCK_CONNECT_FLOW_ENABLED and getLatestSyncEvidence below). No userId: the backend takes the
// user from the Cognito ID token, and sending one would make callers wait for useFetchUser to
// resolve and re-fire the request. channexApi destructures its argument, hence the empty object.
export const getChannexStatus = async () => fetchRealChannexStatus({});

// Open question for Enes: real contract is either a new Channex mapping-list endpoint, or
// filtering hostDashboard/all by mapping -- mocked as a simple list for now. Entries use the
// hostDashboard/all listing shape (listing.property.id), so the swap keeps the same consumers.
const MOCK_MAPPED_LISTINGS = [
  { property: { id: MOCK_DOMITS_PROPERTY_ID, title: "Mock canal house" } },
  { property: { id: "mock-domits-property-id-2", title: "Mock beach apartment" } },
];

// Real endpoint (not built yet): GET <mapped listings>?userId=, returning hostDashboard/all-shaped listings
export const getMappedProperties = async () => {
  return MOCK_MAPPED_LISTINGS;
};

// Real endpoint: GET /integrations/channex/sync-evidence/latest?userId=&domitsPropertyId=
// domitsPropertyId is required by the real endpoint (400 without it), so the tab scopes the
// latest sync to the property picked in the view. Stays mock: the mock echoes it back in the response.
export const getLatestSyncEvidence = async ({ domitsPropertyId } = {}) => {
  return { ...MOCK_SYNC_EVIDENCE_BY_STATE[MOCK_CHANNEX_SYNC_STATE], domitsPropertyId };
};

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
