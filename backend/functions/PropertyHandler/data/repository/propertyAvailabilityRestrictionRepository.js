import { AvailabilityRestrictionMapping } from "../../util/mapping/availabilityRestriction.js";
import Database from "database";
import {Property_Availability_Restriction} from "database/models/Property_Availability_Restriction";
import {Availability_Restrictions} from "database/models/Availability_Restrictions";
import { randomUUID } from "node:crypto";

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

    async replaceRestrictionsByPropertyId(propertyId, restrictions) {
        const client = await Database.getInstance();
        const normalizedRestrictions = Array.from(
            new Map(
                (Array.isArray(restrictions) ? restrictions : [])
                    .map((restriction) => ({
                        restriction: String(restriction?.restriction || "").trim(),
                        value: Number(restriction?.value),
                    }))
                    .filter((restriction) => restriction.restriction && Number.isFinite(restriction.value))
                    .map((restriction) => [
                        restriction.restriction,
                        {
                            restriction: restriction.restriction,
                            value: Math.max(0, Math.trunc(restriction.value)),
                        },
                    ])
            ).values()
        );

        return await client.transaction(async (transactionManager) => {
            if (normalizedRestrictions.length > 0) {
                const restrictionNames = normalizedRestrictions.map((restriction) => restriction.restriction);
                const existingRestrictionMappings = await transactionManager
                    .getRepository(Availability_Restrictions)
                    .createQueryBuilder("availability_restrictions")
                    .select(["availability_restrictions.restriction"])
                    .where("availability_restrictions.restriction IN (:...restrictionNames)", { restrictionNames })
                    .getMany();
                const existingRestrictionNameSet = new Set(
                    existingRestrictionMappings.map((restriction) => String(restriction.restriction))
                );
                const invalidRestrictionNames = restrictionNames.filter(
                    (restrictionName) => !existingRestrictionNameSet.has(restrictionName)
                );
                if (invalidRestrictionNames.length > 0) {
                    throw new Error(`Unknown availability restrictions: ${invalidRestrictionNames.join(", ")}`);
                }

                await transactionManager
                    .createQueryBuilder()
                    .delete()
                    .from(Property_Availability_Restriction)
                    .where("property_id = :propertyId", { propertyId })
                    .andWhere("restriction IN (:...restrictionNames)", { restrictionNames })
                    .execute();

                await transactionManager
                    .createQueryBuilder()
                    .insert()
                    .into(Property_Availability_Restriction)
                    .values(
                        normalizedRestrictions.map((restriction) => ({
                            id: randomUUID(),
                            property_id: propertyId,
                            restriction: restriction.restriction,
                            value: restriction.value,
                        }))
                    )
                    .execute();
            }

            const updatedRestrictions = await transactionManager
                .getRepository(Property_Availability_Restriction)
                .createQueryBuilder("property_availabilityrestriction")
                .where("property_id = :id", { id: propertyId })
                .getMany();
            return updatedRestrictions.length > 0
                ? updatedRestrictions.map((item) => AvailabilityRestrictionMapping.mapDatabaseEntryToAvailabilityRestriction(item))
                : null;
        });
    }

}