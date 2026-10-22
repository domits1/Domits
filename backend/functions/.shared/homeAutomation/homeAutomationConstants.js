export const ACCESS_CREDENTIAL_STATUS = Object.freeze({
  PENDING: "PENDING",
  CREATED: "CREATED",
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

// A credential in one of these statuses no longer opens a lock. Any other status, including one not listed here,
// counts as live, so a status added later blocks an unmap until it is classified. FAILED is not terminal: an issue
// that failed after RemoteLock created the guest may have left a guest and its pin on the lock.
export const TERMINAL_ACCESS_CREDENTIAL_STATUSES = Object.freeze([
  ACCESS_CREDENTIAL_STATUS.EXPIRED,
  ACCESS_CREDENTIAL_STATUS.REVOKED,
  ACCESS_CREDENTIAL_STATUS.CANCELLED,
]);

export const AUDIT_ACTION = Object.freeze({
  MAPPED: "MAPPED",
  REMAPPED: "REMAPPED",
  UNMAPPED: "UNMAPPED",
});

export const REMOTELOCK_CHANNEL = "REMOTELOCK";

export const REMOTELOCK_ACCOUNT_STATUS = Object.freeze({
  NOT_CONNECTED: "NOT_CONNECTED",
  CONNECTING: "CONNECTING",
  CONNECTED: "CONNECTED",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  CONNECTION_ERROR: "CONNECTION_ERROR",
  DISCONNECTED: "DISCONNECTED",
  EXPIRED_CREDENTIALS: "EXPIRED_CREDENTIALS",
});
