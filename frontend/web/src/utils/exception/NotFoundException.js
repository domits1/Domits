class NotFoundException extends Error {
    constructor(message) {
        super(message);
        this.name = "NotFoundException";
    }
}

export default NotFoundException;