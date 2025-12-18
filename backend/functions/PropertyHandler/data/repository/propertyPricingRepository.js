import { PricingMapping } from "../../util/mapping/pricing.js";
import Database from "database";
import {Property_Pricing} from "database/models/Property_Pricing";
import {Property_Calendar_Price} from "database/models/Property_Calendar_Price";

export class PropertyPricingRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }

    /**
     * Convert date string to timestamp
     * @param {string} dateStr - Date in YYYY-MM-DD format
     * @returns {number} - Unix timestamp in milliseconds
     */
    dateToTimestamp(dateStr) {
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
    }

    /**
     * Convert timestamp to date string
     * @param {number} timestamp - Unix timestamp in milliseconds
     * @returns {string} - Date in YYYY-MM-DD format
     */
    timestampToDate(timestamp) {
        return new Date(timestamp).toISOString().split('T')[0];
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

    /**
     * Delete all custom calendar prices for a property
     * Uses the property_calendar_price table (public schema)
     */
    async deleteCustomPricingByPropertyId(propertyId) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .delete()
            .from(Property_Calendar_Price)
            .where("property_id = :id", { id: propertyId })
            .execute();
        return true;
    }

    /**
     * Create a custom price for a specific date
     * Uses the property_calendar_price table (public schema)
     * Data format: { property_id, date (YYYY-MM-DD), price }
     */
    async createCustomPrice(data) {
        const client = await Database.getInstance();
        const timestamp = this.dateToTimestamp(data.date);

        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Calendar_Price)
            .values({
                property_id: data.property_id,
                date: timestamp,
                price: parseInt(data.price)
            })
            .execute();
        return true;
    }

    /**
     * Get all custom calendar prices for a property
     * Returns: { "2024-12-25": 150, "2024-12-26": 200, ... }
     * Uses the property_calendar_price table (public schema)
     */
    async getCustomPricingByPropertyId(propertyId) {
        const client = await Database.getInstance();
        const results = await client
            .getRepository(Property_Calendar_Price)
            .createQueryBuilder("property_calendar_price")
            .where("property_id = :id", { id: propertyId })
            .getMany();

        // Transform to { "YYYY-MM-DD": price } format
        const pricingMap = {};
        results.forEach(row => {
            if (row.date) {
                const dateStr = this.timestampToDate(row.date);
                pricingMap[dateStr] = row.price;
            }
        });

        return pricingMap;
    }

}