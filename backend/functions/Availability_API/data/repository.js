import Database from "database";
import { Property } from "database/models/Property";
// import { NotFoundException } from "../util/exception/NotFoundException.js";

export class Repository {
    async getPropertyById(id) {
        const client = await Database.getInstance();

        const result = await client
            .getRepository(Property)
            .createQueryBuilder("property")
            .where("property.id = :id", { id })
            .getOne();


        return {
            id: result.id,
            hostId: result.hostid,
            title: result.title
        };
    }
}