import { PropertyLocation } from "../../business/model/propertyLocation.js";

export class LocationMapping {

    static mapDatabaseEntryToLocation(locationEntry) {
        return {
            property_id: locationEntry.property_id,
            country: locationEntry.country,
            city: locationEntry.city,
        }
    }

    static mapDatabaseEntryToFullLocation(locationEntry) {
        return new PropertyLocation(
            locationEntry.property_id,
            locationEntry.country,
            locationEntry.city,
            locationEntry.street,
            locationEntry.housenumber,
            locationEntry.housenumberextension,
            locationEntry.postalcode
        )
    }
}