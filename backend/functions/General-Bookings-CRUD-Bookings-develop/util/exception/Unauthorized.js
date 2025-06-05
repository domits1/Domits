class Unauthorized extends Error {
    constructor(message) {
        super(message);
        this.name = "Unauthorized";
        this.statusCode = 401;
    }
}

export default Unauthorized;