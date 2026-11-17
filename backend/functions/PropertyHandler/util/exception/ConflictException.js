export class ConflictException extends Error {
    constructor(message, code) {
        super(message);
        this.name = "ConflictException";
        this.code = code;
        this.statusCode = 409;
    }
}
