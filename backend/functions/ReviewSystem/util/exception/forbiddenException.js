class ForbiddenException extends Error {
  constructor(message = "Forbidden.") {
    super(message);
    this.statusCode = 403;
  }
}

export default ForbiddenException;