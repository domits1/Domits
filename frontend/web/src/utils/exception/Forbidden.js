class Forbidden extends Error {
    constructor(message) {
        super(message);
        this.name = "Forbidden";
    }
}

export default Forbidden;