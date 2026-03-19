export class TypeException extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "TypeException";
    this.statusCode = 400;
  }
}
