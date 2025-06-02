import {Repository} from "../../data/repository.js";

export class Service {
    repository;

    constructor() {
        this.repository = new Repository();
    }

    async getUser() {
        return await this.repository.getUser();
    }
}