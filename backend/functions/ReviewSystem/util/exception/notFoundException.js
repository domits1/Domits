class NotFoundException extends Error {
  constructor(message = "Not found.") {
    super(message);
    this.statusCode = 404;
  }
}

export default NotFoundException;