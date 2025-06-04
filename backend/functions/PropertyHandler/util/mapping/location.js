import { PropertyLocation } from "../../business/model/propertyLocation.js";

export class LocationMapping {

    static mapDatabaseEntryToLocation(locationEntry) {
        return {
            property_id: locationEntry.property_id.S,
            country: locationEntry.country.S,
            city: locationEntry.city.S,
        }
    }

    static mapDatabaseEntryToFullLocation(locationEntry) {
        return new PropertyLocation(
            locationEntry.property_id.S,
            locationEntry.country.S,
            locationEntry.city.S,
            locationEntry.street.S,
            parseFloat(locationEntry.houseNumber.N),
            locationEntry.houseNumberExtension.S,
            locationEntry.postalCode.S
        )
    }
}