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

    async upsertPricingByPropertyId(propertyId, pricing) {
        const client = await Database.getInstance();
        const roomRate = Number(pricing?.roomRate ?? pricing?.roomrate);
        if (!Number.isFinite(roomRate) || roomRate < 2) {
            throw new TypeError("Pricing roomRate must be a number greater than or equal to 2.");
        }

        const cleaningInput = pricing?.cleaning;
        const hasCleaningInput = cleaningInput !== undefined && cleaningInput !== null;
        const parsedCleaning = Number(cleaningInput);
        if (hasCleaningInput && (!Number.isFinite(parsedCleaning) || parsedCleaning < 0)) {
            throw new TypeError("Pricing cleaning must be a number greater than or equal to 0.");
        }

        const existingPricing = await this.getPricingById(propertyId);
        const roomRateValue = Math.trunc(roomRate);
        const cleaningValue = hasCleaningInput
            ? Math.trunc(parsedCleaning)
            : (existingPricing?.cleaning ?? 0);

        if (existingPricing) {
            await client
                .createQueryBuilder()
                .update(Property_Pricing)
                .set({
                    roomrate: roomRateValue,
                    cleaning: cleaningValue,
                })
                .where("property_id = :propertyId", { propertyId })
                .execute();
        } else {
            await client
                .createQueryBuilder()
                .insert()
                .into(Property_Pricing)
                .values({
                    property_id: propertyId,
                    roomrate: roomRateValue,
                    cleaning: cleaningValue,
                })
                .execute();
        }

        return await this.getPricingById(propertyId);
    }

}
