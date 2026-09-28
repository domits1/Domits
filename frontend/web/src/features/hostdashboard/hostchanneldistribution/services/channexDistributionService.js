// Mock data layer for the Distribution tab. Every function here mirrors the signature and
// response shape of the matching real endpoint in hostintegrations/channexApi.js. When the
// backend contract is ready, only this file changes: each function's body becomes a
// requestChannex(...) call (Authorization: Bearer <Cognito ID token>, same as channexApi.js),
// and the two constants below are deleted along with the switch logic that reads them.

// Flip this to preview each connection state in the browser. Must be one of the CHANNEX_STATUS
// values from backend/functions/.shared/channelManagement/channelManagementConstants.js.
// Defaults to NOT_CONNECTED so the tab never shows a fake connection if this ships as-is.
const MOCK_CHANNEX_CONNECTION_STATE = "NOT_CONNECTED";
// NOT_CONNECTED | CONNECTED | RECONNECT_REQUIRED | VALIDATION_FAILED | DISCONNECTED | PENDING_PROVIDER_VALIDATION

// Flip this to preview each "last sync" state in the browser.
const MOCK_CHANNEX_SYNC_STATE = "NONE";
// NONE | SUCCESS | FAILED

const MOCK_INTEGRATION_ACCOUNT_ID = "mock-integration-account-id";
const MOCK_DOMITS_PROPERTY_ID = "mock-domits-property-id";

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

// Real endpoint: GET /integrations/channex/status?userId=
export const getChannexStatus = async ({ userId } = {}) => {
  void userId; // unused until this reads live data
  return MOCK_CHANNEX_STATUS_BY_STATE[MOCK_CHANNEX_CONNECTION_STATE];
};

// Real endpoint: GET /integrations/channex/sync-evidence/latest?userId=&domitsPropertyId=
// domitsPropertyId is required by the real endpoint (400 without it). Open question for Enes:
// whether this tab should scope to one property or show the latest sync across all of a host's
// mapped properties -- the mock ignores the argument's value either way for now.
export const getLatestSyncEvidence = async ({ domitsPropertyId } = {}) => {
  void domitsPropertyId; // unused until this reads live data
  return MOCK_SYNC_EVIDENCE_BY_STATE[MOCK_CHANNEX_SYNC_STATE];
};
