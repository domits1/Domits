export class ConflictException extends Error {
  constructor(message, details) {
    super(message);
    this.name = "ConflictException";
    this.statusCode = 409;
    this.details = details;
  }
}
