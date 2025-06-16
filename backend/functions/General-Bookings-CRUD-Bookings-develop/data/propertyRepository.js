import Database from "database";
import {Property} from "database/models/Property";

class PropertyRepository {
    constructor() {}

    async getPropertyById(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property)
            .createQueryBuilder("property")
            .where("property.id = :id", { id: id })
            .getOne();
        return {
            hostId: result.hostid,
            title: result.title
        };

    }
}
export default PropertyRepository;