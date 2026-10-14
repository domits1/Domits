export class HttpError extends Error {
  constructor(statusCode, message, code = null) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code || `HTTP_${statusCode}`;
  }
}

export const badRequest = (message) => new HttpError(400, message, "BAD_REQUEST");
export const unauthorized = (message = "Authentication is required.") =>
  new HttpError(401, message, "UNAUTHORIZED");
