import { AmenityMapping } from "../../util/mapping/amenity.js";
import Database from "database";
import {Property_Amenity} from "database/models/Property_Amenity";
import {Amenity_And_Category} from "database/models/Amenity_And_Category";
import { randomUUID } from "node:crypto";

export class PropertyAmenityRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }
    async getAmenitiesByPropertyId(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Amenity)
            .createQueryBuilder("property_amenity")
            .where("property_id = :property_id", { property_id: id })
            .getMany();
        return result.length > 0 ? result.map(item => AmenityMapping.mapDatabaseEntryToAmenity(item)) : null;
    }

    async getAmenityAndCategoryById(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Amenity_And_Category)
            .createQueryBuilder("amenity_and_category")
            .where("id = :id", { id: id })
            .getOne();
        return result ? result : null;
    }

    async getPropertyAmenityById(id) {
        const client = await Database.getInstance();
        const result = await client
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

    async replaceAmenitiesByPropertyId(propertyId, amenityIds) {
        const client = await Database.getInstance();
        const normalizedAmenityIds = Array.from(
            new Set((Array.isArray(amenityIds) ? amenityIds : []).map((id) => String(id).trim()).filter(Boolean))
        );

        return await client.transaction(async (transactionManager) => {
            if (normalizedAmenityIds.length > 0) {
                const existingAmenityMappings = await transactionManager
                    .getRepository(Amenity_And_Category)
                    .createQueryBuilder("amenity_and_category")
                    .select(["amenity_and_category.id"])
                    .where("amenity_and_category.id IN (:...amenityIds)", { amenityIds: normalizedAmenityIds })
                    .getMany();
                const existingAmenityIdSet = new Set(existingAmenityMappings.map((amenity) => String(amenity.id)));
                const invalidAmenityIds = normalizedAmenityIds.filter((amenityId) => !existingAmenityIdSet.has(amenityId));
                if (invalidAmenityIds.length > 0) {
                    throw new Error(`Unknown amenity IDs: ${invalidAmenityIds.join(", ")}`);
                }
            }

            await transactionManager
                .createQueryBuilder()
                .delete()
                .from(Property_Amenity)
                .where("property_id = :propertyId", { propertyId })
                .execute();

            if (normalizedAmenityIds.length > 0) {
                await transactionManager
                    .createQueryBuilder()
                    .insert()
                    .into(Property_Amenity)
                    .values(
                        normalizedAmenityIds.map((amenityId) => ({
                            id: randomUUID(),
                            property_id: propertyId,
                            amenityid: amenityId,
                        }))
                    )
                    .execute();
            }

            const updatedAmenities = await transactionManager
                .getRepository(Property_Amenity)
                .createQueryBuilder("property_amenity")
                .where("property_id = :property_id", { property_id: propertyId })
                .getMany();

            return updatedAmenities.length > 0
                ? updatedAmenities.map((item) => AmenityMapping.mapDatabaseEntryToAmenity(item))
                : null;
        });
    }

}
