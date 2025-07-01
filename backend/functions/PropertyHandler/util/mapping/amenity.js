import { PropertyAmenity } from "../../business/model/propertyAmenity.js";

export class AmenityMapping {

    static mapDatabaseEntryToAmenity(amenityEntry) {
        return new PropertyAmenity(
            amenityEntry.id.S,
            amenityEntry.property_id.S,
            amenityEntry.amenityId.S
        )
    }
}