class ConflictException extends Error {
  constructor(message = "Conflict.") {
    super(message);
    this.statusCode = 409;
  }
}

export default ConflictException;