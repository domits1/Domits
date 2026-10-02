// Mock data layer for the Distribution tab. Every function here mirrors the signature and
// response shape of the matching real endpoint in hostintegrations/channexApi.js. When the
// backend contract is ready, only this file changes: each function's body becomes a
// requestChannex(...) call (Authorization: Bearer <Cognito ID token>, same as channexApi.js),
// and the mock-only constants and helpers below are deleted along with the switch logic that
// reads them.

// While false, the Distribution tab's "+ Add channel" button stays disabled even when the
// status is NOT_CONNECTED, so a real host can never trigger this mock connect flow. Flip to
// true only for local preview of the connect/reconnect/disconnect modals. Remove this flag
// entirely once connectChannex/disconnectChannex below call the real endpoints.
export const MOCK_CONNECT_FLOW_ENABLED = false;

// Flip this to preview each connection state in the browser. Must be one of the CHANNEX_STATUS
// values from backend/functions/.shared/channelManagement/channelManagementConstants.js.
// Defaults to NOT_CONNECTED so the tab never shows a fake connection if this ships as-is.
const MOCK_CHANNEX_CONNECTION_STATE = "NOT_CONNECTED";
// NOT_CONNECTED | CONNECTED | RECONNECT_REQUIRED | VALIDATION_FAILED | DISCONNECTED | PENDING_PROVIDER_VALIDATION

// Flip this to preview each "last sync" state in the browser.
const MOCK_CHANNEX_SYNC_STATE = "NONE";
// NONE | SUCCESS | FAILED

// Flip this to preview the status error handling in the browser: getChannexStatus then rejects
// with an error carrying this HTTP status, like requestChannex in hostintegrations/channexApi.js.
// 403 = host outside the Channex allowlist (expected, shown as the normal empty state);
// 401 / 5xx = real error with a Retry button.
const MOCK_CHANNEX_ERROR_STATUS = null;
// null | 401 | 403 | 500

// Flip these to preview each connect/disconnect modal outcome in the browser (only reachable
// once MOCK_CONNECT_FLOW_ENABLED is true).
const MOCK_CONNECT_OUTCOME = "SUCCESS"; // SUCCESS | REJECTED | ERROR
const MOCK_DISCONNECT_OUTCOME = "SUCCESS"; // SUCCESS | ERROR

const MOCK_REQUEST_DELAY_MS = 500;

const MOCK_INTEGRATION_ACCOUNT_ID = "mock-integration-account-id";
const MOCK_DOMITS_PROPERTY_ID = "mock-domits-property-id";

// Mutable, seeded from MOCK_CHANNEX_CONNECTION_STATE. A successful mock connect/disconnect
// advances this so the tab reflects the change within the same browser session; reloading the
// page resets it back to the constant above.
let currentConnectionState = MOCK_CHANNEX_CONNECTION_STATE;

// Shaped like GET /integrations/channex/status, one entry per CHANNEX_STATUS value.
// See backend/functions/.shared/channelManagement/channelManagementService.js,
// checkCredentialIntegrationStatus / buildCredentialStatusResponse.
const MOCK_CHANNEX_STATUS_BY_STATE = {
  NOT_CONNECTED: {
    channel: "CHANNEX",
    integrationAccountId: null,
    status: "NOT_CONNECTED",
    validationMode: "LOCAL_AND_PROVIDER_STATE",
    validationState: "NOT_CONNECTED",
    reason: "No Channex integration row exists for this user.",
    displayName: null,
    externalAccountId: null,
    credentialsRefPresent: false,
    secretPresent: false,
    requiredFieldsPresent: false,
  },
  CONNECTED: {
    channel: "CHANNEX",
    integrationAccountId: MOCK_INTEGRATION_ACCOUNT_ID,
    status: "CONNECTED",
    validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
    validationState: "CONNECTED",
    reason: "Stored Channex credentials are locally valid and provider validation has explicitly succeeded.",
    displayName: "Channex",
    externalAccountId: "mock-external-account-id",
    credentialsRefPresent: true,
    secretPresent: true,
    requiredFieldsPresent: true,
  },
  RECONNECT_REQUIRED: {
    channel: "CHANNEX",
    integrationAccountId: MOCK_INTEGRATION_ACCOUNT_ID,
    status: "RECONNECT_REQUIRED",
    validationMode: "LOCAL_SECRET_VALIDATION",
    validationState: "RECONNECT_REQUIRED",
    reason: "Integration row exists but credentialsRef is missing.",
    displayName: "Channex",
    externalAccountId: null,
    credentialsRefPresent: false,
    secretPresent: false,
    requiredFieldsPresent: false,
  },
  VALIDATION_FAILED: {
    channel: "CHANNEX",
    integrationAccountId: MOCK_INTEGRATION_ACCOUNT_ID,
    status: "VALIDATION_FAILED",
    validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
    validationState: "VALIDATION_FAILED",
    reason: "Channex provider validation failed.",
    displayName: "Channex",
    externalAccountId: null,
    credentialsRefPresent: true,
    secretPresent: true,
    requiredFieldsPresent: true,
  },
  DISCONNECTED: {
    channel: "CHANNEX",
    integrationAccountId: MOCK_INTEGRATION_ACCOUNT_ID,
    status: "DISCONNECTED",
    validationMode: "LOCAL_AND_PROVIDER_STATE",
    validationState: "DISCONNECTED",
    reason: "Channex integration is disconnected in Domits and is not locally usable.",
    displayName: "Channex",
    externalAccountId: null,
    credentialsRefPresent: false,
    secretPresent: false,
    requiredFieldsPresent: false,
  },
  PENDING_PROVIDER_VALIDATION: {
    channel: "CHANNEX",
    integrationAccountId: MOCK_INTEGRATION_ACCOUNT_ID,
    status: "PENDING_PROVIDER_VALIDATION",
    validationMode: "LOCAL_SECRET_AND_PROVIDER_VALIDATION",
    validationState: "PENDING_PROVIDER_VALIDATION",
    reason: "Stored Channex credentials are locally valid, but provider validation has not explicitly succeeded.",
    displayName: "Channex",
    externalAccountId: null,
    credentialsRefPresent: true,
    secretPresent: true,
    requiredFieldsPresent: true,
  },
};

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

// Real endpoint: GET /integrations/channex/status?userId=
// eslint-disable-next-line no-unused-vars
export const getChannexStatus = async ({ userId } = {}) => {
  // userId is unused until this reads live data
  if (MOCK_CHANNEX_ERROR_STATUS) {
    throw buildMockChannexRequestError({
      method: "GET",
      endpoint: "/integrations/channex/status",
      status: MOCK_CHANNEX_ERROR_STATUS,
      error: "Mock status error",
    });
  }
  return MOCK_CHANNEX_STATUS_BY_STATE[currentConnectionState];
};

// Real endpoint: GET /integrations/channex/sync-evidence/latest?userId=&domitsPropertyId=
// domitsPropertyId is required by the real endpoint (400 without it). Open question for Enes:
// whether this tab should scope to one property or show the latest sync across all of a host's
// mapped properties -- the mock ignores the argument's value either way for now.
// eslint-disable-next-line no-unused-vars
export const getLatestSyncEvidence = async ({ domitsPropertyId } = {}) => {
  // domitsPropertyId is unused until this reads live data
  return MOCK_SYNC_EVIDENCE_BY_STATE[MOCK_CHANNEX_SYNC_STATE];
};

// Real endpoint: POST /integrations/channex/connect ({ credentials: { apiKey }, displayName? }).
// apiKey is only ever read here to build a masked preview; it is never stored or logged.
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

  if (connected) currentConnectionState = "CONNECTED";

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

// Real endpoint: POST /integrations/channex/disconnect ({ userId }).
// The real backend leaves the integration row's status as DISCONNECTED (it clears
// credentialsRef/externalAccountId but never deletes the row), and GET /status keeps reporting
// that same status afterwards -- so the mock advances here to DISCONNECTED, not NOT_CONNECTED.
// eslint-disable-next-line no-unused-vars
export const disconnectChannex = async ({ userId } = {}) => {
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

  currentConnectionState = "DISCONNECTED";

  return {
    disconnected: true,
    channel: "CHANNEX",
    integrationAccountId: MOCK_INTEGRATION_ACCOUNT_ID,
    status: "DISCONNECTED",
    message:
      "Channex integration disconnected in Domits. credentialsRef was cleared on the integration row; the underlying secret is not deleted by this flow.",
  };
};
