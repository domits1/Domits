import Database from "database";
import {Property} from "database/models/Property";
import NotFoundException from "../util/exception/NotFoundException.js"

class PropertyRepository {
    constructor() {
    }

    async getPropertyById(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property)
            .createQueryBuilder("property")
            .addSelect("property.automatedwelcomemessage")
            .addSelect("property.automatedcheckinmessage")
            .where("property.id = :id", {id: id})
            .getOne();
        if (result) {
            return {
                hostId: result.hostid,
                title: result.title,
                automatedWelcomeMessage: result.automatedwelcomemessage,
                automatedCheckinMessage: result.automatedcheckinmessage
            }
        } else {
            throw new NotFoundException("Property is inactive or does not exist.")
        }
    
    }
    
}

export default PropertyRepository;