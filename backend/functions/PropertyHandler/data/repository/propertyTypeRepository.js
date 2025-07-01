import { TypeMapping } from "../../util/mapping/type.js";
import Database from "database";
import {Property_Type} from "database/models/Property_Type";
import {Property_Types} from "database/models/Property_Types";

export class PropertyTypeRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }

    async getPropertyTypeById(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Types)
            .createQueryBuilder("property_types")
            .where("type = :id", { id: id })
            .getOne();
        return result ? result : null;
    }

    async getPropertyTypeByPropertyId(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Type)
            .createQueryBuilder("property_type")
            .where("property_id = :id", { id: id })
            .getOne();
        return result ? TypeMapping.mapDatabaseEntryToType(result) : null;
    }

    async create(type) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Type)
            .values({
                property_id: type.property_id,
                spacetype: type.spaceType,
                type: type.property_type
            })
            .execute();
        const result = await this.getPropertyTypeByPropertyId(type.property_id);
        return result ? result : null;
    }

}