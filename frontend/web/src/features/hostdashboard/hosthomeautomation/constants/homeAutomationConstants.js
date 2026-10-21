// Turns the RemoteLock page on: the "Home automation" card in Settings and the settings/home-automation
// route. Off until the backend exists; with it off the route redirects to Settings.
// Turning it on requires:
//   - the real service in place of the mock (services/remoteLockService.js),
//   - a decision on who can see the card, because it shows to every host once on,
//   - a native-speaker review of the nl, de and es copy,
//   - updating the "ships switched off" test in homeAutomationConstants.test.js.
export const REMOTELOCK_UI_ENABLED = false;

// Tone picks the badge colour, labelKey is the key under settings.homeAutomation.statuses in the content
// files, and actions are what the host may do from that status (each is a button on the status card and a key
// under settings.homeAutomation.actions).
export const STATUS_PRESENTATION = Object.freeze({
  NOT_CONNECTED: { tone: "neutral", labelKey: "notConnected", actions: ["connect"] },
  CONNECTING: { tone: "pending", labelKey: "connecting", actions: [] },
  CONNECTED: { tone: "success", labelKey: "connected", actions: ["disconnect"] },
  AUTHENTICATION_ERROR: { tone: "error", labelKey: "authenticationError", actions: ["reconnect", "disconnect"] },
  CONNECTION_ERROR: { tone: "error", labelKey: "connectionError", actions: ["reconnect", "disconnect"] },
  DISCONNECTED: { tone: "neutral", labelKey: "disconnected", actions: ["connect"] },
  EXPIRED_CREDENTIALS: { tone: "error", labelKey: "expiredCredentials", actions: ["reconnect", "disconnect"] },
});

export const UNKNOWN_STATUS_PRESENTATION = Object.freeze({ tone: "neutral", labelKey: "unknown", actions: [] });

// hasOwnProperty, not a plain lookup: a status such as "constructor" must not resolve to something inherited.
export const getStatusPresentation = (status) =>
  Object.prototype.hasOwnProperty.call(STATUS_PRESENTATION, status)
    ? STATUS_PRESENTATION[status]
    : UNKNOWN_STATUS_PRESENTATION;

// Keys under settings.homeAutomation.devices.types / .statuses. RemoteLock reports these type values; any other
// type is shown as "other" and any other status as "unknown", so a new value never renders blank.
const DEVICE_TYPE_LABEL_KEYS = Object.freeze({
  lock: "lock",
  zwave_lock: "zwaveLock",
  connector_lock: "connectorLock",
  schlage_home_lock: "schlageHomeLock",
  resort_lock: "resortLock",
});

const DEVICE_STATUS_LABEL_KEYS = Object.freeze({ ONLINE: "online", OFFLINE: "offline", UNKNOWN: "unknown" });

// Device types the page lists but cannot manage yet.
export const UNSUPPORTED_DEVICE_TYPES = Object.freeze(["resort_lock"]);

const labelKeyOf = (labelKeys, value, fallback) =>
  Object.prototype.hasOwnProperty.call(labelKeys, value) ? labelKeys[value] : fallback;

export const getDeviceTypeLabelKey = (type) => labelKeyOf(DEVICE_TYPE_LABEL_KEYS, type, "other");

export const getDeviceStatusLabelKey = (status) => labelKeyOf(DEVICE_STATUS_LABEL_KEYS, status, "unknown");

export const DEVICE_TYPE_LABEL_KEY_VALUES = [...Object.values(DEVICE_TYPE_LABEL_KEYS), "other"];
export const DEVICE_STATUS_LABEL_KEY_VALUES = Object.values(DEVICE_STATUS_LABEL_KEYS);
