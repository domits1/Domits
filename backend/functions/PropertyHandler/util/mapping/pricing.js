import { PropertyPricing } from "../../business/model/propertyPricing.js";

export class PricingMapping {

    static mapDatabaseEntryToPricing(pricingEntry) {
        return new PropertyPricing(
            pricingEntry.property_id.S,
            parseFloat(pricingEntry.roomRate.N),
            parseFloat(pricingEntry.cleaning.N),
            parseFloat(pricingEntry.service.N)
        )
    }
}