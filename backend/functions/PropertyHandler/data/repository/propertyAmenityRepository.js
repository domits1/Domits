import { AmenityMapping } from "../../util/mapping/amenity.js";
import Database from "database";
import {Property_Amenity} from "database/models/Property_Amenity";
import {Amenity_And_Category} from "database/models/Amenity_And_Category";

export class PropertyAmenityRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }
    async getAmenitiesByPropertyId(id) {
        const client = await Database.getInstance();
        const result = client
            .getRepository(Property_Amenity)
            .createQueryBuilder("property_amenity")
            .where("property_id = :property_id", { property_id: id })
            .getMany();
        return result.length > 0 ? result.map(item => AmenityMapping.mapDatabaseEntryToAmenity(item)) : null;
    }

    async getAmenityAndCategoryById(id) {
        const client = await Database.getInstance();
        const result = client
            .getRepository(Amenity_And_Category)
            .createQueryBuilder("amenity_and_category")
            .where("id = :id", { id: id })
            .getOne();
        return result ? result : null;
    }

    async getPropertyAmenityById(id) {
        const client = await Database.getInstance();
        const result = client
            .getRepository(Property_Amenity)
            .createQueryBuilder("property_amenity")
            .where("id = :id", { id: id })
            .getOne();
        return result ? result : null;
    }

    async create(amenity) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Amenity)
            .values({
                id: amenity.id,
                amenityid: amenity.amenityId,
                property_id: amenity.property_id
            })
            .execute();
        const result = await this.getPropertyAmenityById(amenity.id);
        return result ? result : null;
    }

}