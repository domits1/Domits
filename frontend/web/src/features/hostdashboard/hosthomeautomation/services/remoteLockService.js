// Mock service for the RemoteLock page: nothing here calls a backend. Each function keeps the shape of the
// endpoint named above it, so replacing a mock with the real call later changes this file only.
//
// To preview a state: set REMOTELOCK_UI_ENABLED = true (homeAutomationConstants.js) and MOCK_STATUS below to
// the state you want, look at Settings > Home automation, then revert both before committing. Connect and
// disconnect change the mocked status in memory, so you can click through NOT_CONNECTED > CONNECTED > DISCONNECTED;
// a page reload starts again from MOCK_STATUS.

export const MOCK_STATUS = "NOT_CONNECTED";
const MOCK_LAST_SYNC_AT = Date.UTC(2026, 9, 8, 9, 30);

// Held in the module so a later connect or disconnect can change what the next status read returns.
let currentStatus = MOCK_STATUS;

export const resetMockRemoteLock = () => {
  currentStatus = MOCK_STATUS;
};

export const setMockRemoteLockStatus = (status) => {
  currentStatus = status;
};

// Real endpoint (not built yet): GET /integrations/home-automation/remotelock/status
// lastSyncAt is epoch milliseconds, or null when nothing has synced.
export const getRemoteLockStatus = async () => ({
  status: currentStatus,
  lastSyncAt: currentStatus === "CONNECTED" ? MOCK_LAST_SYNC_AT : null,
});

// Real endpoint (not built yet): POST /integrations/home-automation/remotelock/connect
// The real one will hand back a RemoteLock sign-in URL to send the host to; the mock connects straight away.
// Resolves with the new status, in the shape of getRemoteLockStatus.
export const connectRemoteLock = async () => {
  currentStatus = "CONNECTED";
  return getRemoteLockStatus();
};

// Real endpoint (not built yet): POST /integrations/home-automation/remotelock/disconnect
// Resolves with the new status, in the shape of getRemoteLockStatus.
export const disconnectRemoteLock = async () => {
  currentStatus = "DISCONNECTED";
  return getRemoteLockStatus();
};
