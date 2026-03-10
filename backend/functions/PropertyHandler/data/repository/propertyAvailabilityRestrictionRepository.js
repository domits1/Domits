import { AvailabilityRestrictionMapping } from "../../util/mapping/availabilityRestriction.js";
import Database from "database";
import {Property_Availability_Restriction} from "database/models/Property_Availability_Restriction";
import {Availability_Restrictions} from "database/models/Availability_Restrictions";
import { randomUUID } from "node:crypto";

const RESTRICTION_NAME_FALLBACKS = Object.freeze({
    MinimumAdvanceReservation: ["MinimumAdvanceNoticeDays", "MinimumAdvanceBookingDays"],
    MaximumAdvanceReservation: ["MaximumAdvanceNoticeDays", "MaximumAdvanceBookingDays"],
    PreparationTimeDays: ["PreparationDays", "TurnoverDays"],
});

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
                const restrictionLookupNames = Array.from(
                    new Set(
                        restrictionNames.flatMap((restrictionName) => [
                            restrictionName,
                            ...(RESTRICTION_NAME_FALLBACKS[restrictionName] || []),
                        ])
                    )
                );
                const existingRestrictionMappings = await transactionManager
                    .getRepository(Availability_Restrictions)
                    .createQueryBuilder("availability_restrictions")
                    .select(["availability_restrictions.restriction"])
                    .where("availability_restrictions.restriction IN (:...restrictionNames)", {
                        restrictionNames: restrictionLookupNames,
                    })
                    .getMany();
                const existingRestrictionNameSet = new Set(
                    existingRestrictionMappings.map((restriction) => String(restriction.restriction))
                );

                const remappedRestrictions = normalizedRestrictions.map((restriction) => {
                    if (existingRestrictionNameSet.has(restriction.restriction)) {
                        return restriction;
                    }

                    const fallbackNames = RESTRICTION_NAME_FALLBACKS[restriction.restriction] || [];
                    const fallbackRestrictionName = fallbackNames.find((fallbackName) =>
                        existingRestrictionNameSet.has(fallbackName)
                    );

                    if (!fallbackRestrictionName) {
                        return restriction;
                    }

                    return {
                        ...restriction,
                        restriction: fallbackRestrictionName,
                    };
                });

                const deduplicatedRestrictions = Array.from(
                    new Map(
                        remappedRestrictions.map((restriction) => [
                            restriction.restriction,
                            restriction,
                        ])
                    ).values()
                );

                const deduplicatedRestrictionNames = deduplicatedRestrictions.map(
                    (restriction) => restriction.restriction
                );
                const invalidRestrictionNames = deduplicatedRestrictionNames.filter(
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
                    .andWhere("restriction IN (:...restrictionNames)", {
                        restrictionNames: deduplicatedRestrictionNames,
                    })
                    .execute();

                await transactionManager
                    .createQueryBuilder()
                    .insert()
                    .into(Property_Availability_Restriction)
                    .values(
                        deduplicatedRestrictions.map((restriction) => ({
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
