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
export const forbidden = (message = "You are not allowed to access this resource.") =>
  new HttpError(403, message, "FORBIDDEN");
export const notFound = (message = "Resource not found.") => new HttpError(404, message, "NOT_FOUND");
