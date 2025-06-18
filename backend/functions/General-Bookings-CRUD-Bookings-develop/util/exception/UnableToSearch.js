class UnableToSearch extends Error {
    constructor() {
        super("A API call has failed. Have you checked your query parameters?");
        this.name = "Error";
        this.statusCode = 500;
    }
}

export default UnableToSearch;