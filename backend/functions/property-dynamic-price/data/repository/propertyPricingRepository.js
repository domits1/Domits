import { PricingMapping } from "../../util/mapping/pricing.js";
import Database from "database";
import {Property_Pricing} from "database/models/Property_Pricing";

export class PropertyPricingRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }

    async getPricingById(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Pricing)
            .createQueryBuilder("property_pricing")
            .where("property_id = :id", { id: id })
            .getOne();
        return result ? PricingMapping.mapDatabaseEntryToPricing(result) : null;
    }

    async create(pricing) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Pricing)
            .values({
                property_id: pricing.property_id,
                cleaning: pricing.cleaning,
                roomrate: pricing.roomRate
            })
            .execute();
        const result = await this.getPricingById(pricing.property_id);
        return result ? result : null;
    }

    async deleteCustomPricingByPropertyId(propertyId) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .delete()
            .from(Property_Pricing)
            .where("property_id = :id", { id: propertyId })
            .andWhere("date IS NOT NULL") // Only delete custom per-date pricing
            .execute();
        return true;
    }

    async createCustomPrice(data) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Pricing)
            .values({
                property_id: data.property_id,
                date: data.date,
                price: data.price
            })
            .execute();
        return true;
    }

    async getCustomPricingByPropertyId(propertyId) {
        const client = await Database.getInstance();
        const results = await client
            .getRepository(Property_Pricing)
            .createQueryBuilder("property_pricing")
            .where("property_id = :id", { id: propertyId })
            .andWhere("date IS NOT NULL") // Only get custom per-date pricing
            .getMany();

        // Transform to { "YYYY-MM-DD": price } format
        const pricingMap = {};
        results.forEach(row => {
            if (row.date) {
                // Convert date to YYYY-MM-DD string
                const dateStr = typeof row.date === 'string'
                    ? row.date
                    : new Date(row.date).toISOString().split('T')[0];
                pricingMap[dateStr] = row.price;
            }
        });

        return pricingMap;
    }

}