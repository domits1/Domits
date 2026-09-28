class UnauthorizedException extends Error {
  constructor(message = "Unauthorized.") {
    super(message);
    this.statusCode = 401;
  }
}

export default UnauthorizedException;