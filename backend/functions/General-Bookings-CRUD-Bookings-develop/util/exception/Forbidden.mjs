class Forbidden extends Error {
    constructor(message) {
        super(message);
        this.name = "Forbidden";
        this.statusCode = 403;
    }
}

export default Forbidden;