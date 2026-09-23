class BadRequestException extends Error {
  constructor(message = "Bad request.") {
    super(message);
    this.statusCode = 400;
  }
}

export default BadRequestException;