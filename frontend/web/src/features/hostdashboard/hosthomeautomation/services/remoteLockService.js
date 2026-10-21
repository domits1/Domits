// Mock service for the RemoteLock page: nothing here calls a backend. Each function keeps the shape of the
// endpoint named above it, so replacing a mock with the real call later changes this file only.
//
// To preview a state: set REMOTELOCK_UI_ENABLED = true (homeAutomationConstants.js) and MOCK_STATUS below to
// the state you want, look at Settings > Home automation, then revert both before committing. Connect and
// disconnect change the mocked status in memory, so you can click through NOT_CONNECTED > CONNECTED (devices
// appear) > DISCONNECTED (devices disappear); a page reload starts again from MOCK_STATUS.

export const MOCK_STATUS = "NOT_CONNECTED";
const MOCK_LAST_SYNC_AT = Date.UTC(2026, 9, 8, 9, 30);

// Types are the values RemoteLock reports. lastSeenAt is epoch milliseconds or null, battery is a percentage or null.
const MOCK_DEVICES = [
  {
    id: "lock-1",
    name: "Front door",
    type: "lock",
    status: "ONLINE",
    battery: 82,
    lastSeenAt: Date.UTC(2026, 9, 8, 9, 25),
  },
  {
    id: "lock-2",
    name: "Back entrance",
    type: "zwave_lock",
    status: "OFFLINE",
    battery: 15,
    lastSeenAt: Date.UTC(2026, 9, 7, 18, 2),
  },
  {
    id: "lock-3",
    name: "Garage keypad",
    type: "connector_lock",
    status: "UNKNOWN",
    battery: null,
    lastSeenAt: null,
  },
  {
    id: "lock-4",
    name: "Guest cottage",
    type: "schlage_home_lock",
    status: "ONLINE",
    battery: 64,
    lastSeenAt: Date.UTC(2026, 9, 8, 9, 10),
  },
  {
    id: "lock-5",
    name: "Pool gate",
    type: "resort_lock",
    status: "ONLINE",
    battery: null,
    lastSeenAt: Date.UTC(2026, 9, 8, 8, 45),
  },
];

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

// Real endpoint (not built yet): GET /integrations/home-automation/remotelock/devices
// Only meaningful while the account is CONNECTED; the page does not call it in any other status.
export const getRemoteLockDevices = async () => MOCK_DEVICES.map((device) => ({ ...device }));
