export class ForbiddenException extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 403;
  }
}
