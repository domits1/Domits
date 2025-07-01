import { AvailabilityMapping } from "../../util/mapping/availability.js";
import Database from "database";
import {Property_Availability} from "database/models/Property_Availability";

export class PropertyAvailabilityRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }
    
    async getAvailabilityByPropertyIdAndStartDate(id, availableStartDate) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Availability)
            .createQueryBuilder("property_availability")
            .where("property_id = :id", { id: id })
            .andWhere("availablestartdate = :availablestartdate", { availablestartdate: availableStartDate })
            .getOne()
        return result ? result : null;
    }

    async getAvailabilityByPropertyId(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Availability)
            .createQueryBuilder("property_availability")
            .where("property_id = :id", { id: id })
            .getMany();
        return result ? result.map(item => AvailabilityMapping.mapDatabaseEntryToAvailability(item)) : null;
    }

    async create(availability) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Availability)
            .values({
                property_id: availability.property_id,
                availablestartdate: availability.availableStartDate,
                availableenddate: availability.availableEndDate
            })
            .execute();
        const result = await this.getAvailabilityByPropertyIdAndStartDate(availability.property_id, availability.availableStartDate);
        return result ? result: null;
    }

}