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

}