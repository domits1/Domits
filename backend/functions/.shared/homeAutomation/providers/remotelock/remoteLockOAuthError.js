export const REMOTELOCK_OAUTH_ERROR_CODE = Object.freeze({
  HTTP: "HTTP",
  AUTH: "AUTH",
  RATE_LIMIT: "RATE_LIMIT",
  TIMEOUT: "TIMEOUT",
  NETWORK: "NETWORK",
  INVALID_RESPONSE: "INVALID_RESPONSE",
});

// The standard OAuth error names. The "error" field of a response is the only part of an error body that is
// ever kept, and only when it is one of these.
const KNOWN_OAUTH_ERRORS = new Set([
  "invalid_grant",
  "invalid_client",
  "invalid_request",
  "unauthorized_client",
  "unsupported_grant_type",
  "invalid_scope",
]);

export const allowedOAuthError = (value) => (typeof value === "string" && KNOWN_OAUTH_ERRORS.has(value) ? value : null);

// Carries only what a caller needs to decide what to do next. Deliberately no response body and no cause: an
// OAuth error body can echo the request, which holds the client secret and a refresh token. The message is fixed
// text, the operation and the status, never anything the provider sent.
export class RemoteLockOAuthError extends Error {
  constructor({ operation, code, status = null, retryable, oauthError = null }) {
    super(
      status === null
        ? `RemoteLock OAuth ${operation} failed (${code}).`
        : `RemoteLock OAuth ${operation} failed with status ${status}.`
    );
    this.name = "RemoteLockOAuthError";
    this.operation = operation;
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.oauthError = oauthError;
  }
}
