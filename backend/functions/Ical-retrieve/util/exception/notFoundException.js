export class NotFoundException extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 404;
  }
}
