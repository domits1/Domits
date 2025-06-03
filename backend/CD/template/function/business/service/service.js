import {Repository} from "../../data/repository.js";
import {DatabaseException} from "../../util/exception/databaseException.js";

export class Service {
    repository;

    constructor() {
        this.repository = new Repository();
    }

    async getUser() {
        return await this.repository.getUser();
    }
}