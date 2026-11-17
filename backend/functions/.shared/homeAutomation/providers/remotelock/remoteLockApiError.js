export const REMOTELOCK_ERROR_CODE = Object.freeze({
  HTTP: "HTTP",
  AUTH: "AUTH",
  RATE_LIMIT: "RATE_LIMIT",
  TIMEOUT: "TIMEOUT",
  NETWORK: "NETWORK",
  INVALID_RESPONSE: "INVALID_RESPONSE",
});

// Carries only what a caller needs to decide what to do next. It deliberately has no response body and no
// cause: RemoteLock error bodies echo request attributes, which can include a pin. The message is built from
// fixed text, the operation name and the status, never from anything the provider sent.
export class RemoteLockApiError extends Error {
  constructor({ operation, code, status = null, retryable, retryAfterMs = null }) {
    super(
      status === null
        ? `RemoteLock ${operation} failed (${code}).`
        : `RemoteLock ${operation} failed with status ${status}.`
    );
    this.name = "RemoteLockApiError";
    this.operation = operation;
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}
