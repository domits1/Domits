export class BadRequestException extends Error {

    constructor(message) {
        super(message);
        this.statusCode = 400;
    }

}