class ConflictException extends Error {
  constructor(message) {
    super(message);
    this.name = "ConflictException";
    this.statusCode = 409;
  }
}

export default ConflictException;

