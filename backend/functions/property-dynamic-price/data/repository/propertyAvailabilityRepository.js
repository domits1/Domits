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

    async deleteByPropertyId(propertyId) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .delete()
            .from(Property_Availability)
            .where("property_id = :id", { id: propertyId })
            .execute();
        return true;
    }

    async createBlocked(data) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Availability)
            .values({
                property_id: data.property_id,
                availablestartdate: data.date,
                availableenddate: data.date,
                status: 'blocked'
            })
            .execute();
        return true;
    }

    async createMaintenance(data) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Availability)
            .values({
                property_id: data.property_id,
                availablestartdate: data.date,
                availableenddate: data.date,
                status: 'maintenance',
                note: data.note || null
            })
            .execute();
        return true;
    }

    async getBlockedAndMaintenanceByPropertyId(propertyId) {
        const client = await Database.getInstance();
        const results = await client
            .getRepository(Property_Availability)
            .createQueryBuilder("property_availability")
            .where("property_id = :id", { id: propertyId })
            .andWhere("status IN (:...statuses)", { statuses: ['blocked', 'maintenance'] })
            .getMany();

        const blocked = [];
        const maintenance = [];

        results.forEach(row => {
            const dateStr = typeof row.availablestartdate === 'string'
                ? row.availablestartdate
                : new Date(row.availablestartdate).toISOString().split('T')[0];

            if (row.status === 'blocked') {
                blocked.push(dateStr);
            } else if (row.status === 'maintenance') {
                maintenance.push({
                    date: dateStr,
                    note: row.note || ''
                });
            }
        });

        return { blocked, maintenance };
    }

}