import { Repository } from "../../data/repository.js";
import { DatabaseException } from "../../util/exception/databaseException.js";

export class Service {
    repository;

    constructor() {
        this.repository = new Repository();
    }

    async getPropertyById(id) {
        try {
            if (!id) {
                throw new Error("Property ID is required.");
            }
 
            return await this.repository.getPropertyById(id);

        } catch (err) {
            if (err.name === "NotFoundException") {
                throw err; 
            }
            
            throw new DatabaseException(err.message);
        }
    }
}