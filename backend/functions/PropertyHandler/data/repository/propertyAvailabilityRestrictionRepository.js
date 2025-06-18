import { AvailabilityRestrictionMapping } from "../../util/mapping/availabilityRestriction.js";
import Database from "database";
import {Property_Availability_Restriction} from "database/models/Property_Availability_Restriction";
import {Availability_Restrictions} from "database/models/Availability_Restrictions";

export class PropertyAvailabilityRestrictionRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }

    async getAvailabilityRestrictionById(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Availability_Restrictions)
            .createQueryBuilder("availability_restrictions")
            .where("restriction = :id", { id: id })
            .getOne()
        return result ? result : null;
    }

    async getPropertyAvailabilityRestrictionById(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Availability_Restriction)
            .createQueryBuilder("property_availabilityrestriction")
            .where("id = :id", { id: id })
            .getOne()
        return result ? result : null;
    }

    async getAvailabilityRestrictionsByPropertyId(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Availability_Restriction)
            .createQueryBuilder("property_availabilityrestriction")
            .where("property_id = :id", { id: id })
            .getMany()
        return result.length > 0 ? result.map(item => AvailabilityRestrictionMapping.mapDatabaseEntryToAvailabilityRestriction(item)) : null;
    }

    async create(availabilityRestriction) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Availability_Restriction)
            .values({
                id: availabilityRestriction.id,
                property_id: availabilityRestriction.property_id,
                restriction: availabilityRestriction.restriction,
                value: availabilityRestriction.value
            })
            .execute();
        const result = await this.getPropertyAvailabilityRestrictionById(availabilityRestriction.id);
        return result ? result: null;
    }

}