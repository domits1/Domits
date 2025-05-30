import {Repository} from "../../data/repository.js";
import {DatabaseException} from "../../util/exception/databaseException.js";

export class Service {
    repository;

    constructor() {
        this.repository = new Repository();
    }

    async getUser(id) {
        const user = await this.repository.getUser(id);
        if (user.id !== id) {
            throw new DatabaseException("Something went wrong while fetching the requested user.")
        }
        return user;
    }
}