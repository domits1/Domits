// Backend error code -> key under settings.homeAutomation.errors. A code that is not listed has no key, and the
// caller shows the generic message instead.
const MESSAGE_KEY_BY_CODE = Object.freeze({
  NOT_CONNECTED: "needsReconnect",
  NEEDS_RECONNECT: "needsReconnect",
  ALREADY_CONNECTED: "alreadyConnected",
  CONFIG_MISSING: "notConfigured",
  LEASE_UNAVAILABLE: "tryLater",
  SECRET_STORE_ERROR: "tryLater",
  PROVIDER_UNAVAILABLE: "tryLater",
  RATE_LIMITED: "tryLater",
  STATE_INVALID: "startAgain",
  STATE_EXPIRED: "startAgain",
  CODE_REJECTED: "startAgain",
  MISSING_FIELD: "startAgain",
  PROVIDER_AUTH: "providerError",
  PROVIDER_ERROR: "providerError",
  CONFIG_ERROR: "providerError",
});

// hasOwnProperty, not a plain lookup: a code such as "constructor" must not resolve to something inherited.
export const getErrorMessageKey = (code) =>
  Object.prototype.hasOwnProperty.call(MESSAGE_KEY_BY_CODE, code) ? MESSAGE_KEY_BY_CODE[code] : null;

export const getErrorMessage = (code, copy) => copy.errors[getErrorMessageKey(code)] ?? copy.modal.error;
