
export class ConflictException extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
  }
}