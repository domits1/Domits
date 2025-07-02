class UnableToSearch extends Error {
    constructor() {
        super("A API call has failed. Have you checked your query parameters? This could also mean that there were no results.");
        this.name = "Error";
        this.statusCode = 500;
    }
}

export default UnableToSearch;