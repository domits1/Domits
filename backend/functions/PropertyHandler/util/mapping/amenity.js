import { PropertyAmenity } from "../../business/model/propertyAmenity.js";

export class AmenityMapping {

    static mapDatabaseEntryToAmenity(amenityEntry) {
        return new PropertyAmenity(
            amenityEntry.id,
            amenityEntry.property_id,
            amenityEntry.amenityid
        )
    }
}