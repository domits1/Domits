export class HttpError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details = null) => new HttpError(400, "BAD_REQUEST", message, details);
export const unauthorized = (message) => new HttpError(401, "UNAUTHORIZED", message);
export const forbidden = (message) => new HttpError(403, "FORBIDDEN", message);
export const notFound = (message) => new HttpError(404, "NOT_FOUND", message);
export const serviceUnavailable = (message, details = null) =>
  new HttpError(503, "SCHEMA_NOT_READY", message, details);
