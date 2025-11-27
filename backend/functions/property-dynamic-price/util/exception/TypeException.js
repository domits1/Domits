export class TypeException extends Error {
    constructor(message) {
        super(message);
        this.name = "TypeException";
        this.statusCode = 400;
    }
}