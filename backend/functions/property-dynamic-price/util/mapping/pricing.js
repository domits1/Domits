import { PropertyPricing } from "../../business/model/propertyPricing.js";

export class PricingMapping {

    static mapDatabaseEntryToPricing(pricingEntry) {
        return new PropertyPricing(
            pricingEntry.property_id,
            pricingEntry.roomrate,
            pricingEntry.cleaning !== null ? pricingEntry.cleaning : null,
        )
    }
}