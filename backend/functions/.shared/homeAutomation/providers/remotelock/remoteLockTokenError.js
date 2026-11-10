export const REMOTELOCK_TOKEN_ERROR_CODE = Object.freeze({
  NOT_CONNECTED: "NOT_CONNECTED",
  NEEDS_RECONNECT: "NEEDS_RECONNECT",
  UNEXPECTED: "UNEXPECTED",
  CONFIG_ERROR: "CONFIG_ERROR",
  SECRET_INVALID: "SECRET_INVALID",
  SECRET_STORE_ERROR: "SECRET_STORE_ERROR",
  LEASE_UNAVAILABLE: "LEASE_UNAVAILABLE",
  PROVIDER_UNAVAILABLE: "PROVIDER_UNAVAILABLE",
});

const MESSAGES = Object.freeze({
  NOT_CONNECTED: "RemoteLock is not connected for this account.",
  NEEDS_RECONNECT: "RemoteLock must be reconnected for this account.",
  UNEXPECTED: "An unexpected error occurred while getting the RemoteLock token.",
  CONFIG_ERROR: "RemoteLock rejected the Domits app credentials.",
  SECRET_INVALID: "The stored RemoteLock credentials are unreadable.",
  SECRET_STORE_ERROR: "The RemoteLock credentials could not be read or saved.",
  LEASE_UNAVAILABLE: "Another RemoteLock token refresh is in progress.",
  PROVIDER_UNAVAILABLE: "RemoteLock is not available right now.",
});

// Fixed text and two flags, never a cause: whatever failed underneath can hold a token or the client secret.
export class RemoteLockTokenError extends Error {
  constructor({ code, retryable }) {
    super(MESSAGES[code] ?? "RemoteLock token error.");
    this.name = "RemoteLockTokenError";
    this.code = code;
    this.retryable = retryable;
  }
}
