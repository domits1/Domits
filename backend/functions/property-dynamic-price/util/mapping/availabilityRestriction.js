import { PropertyAvailabilityRestriction } from "../../business/model/propertyAvailabilityRestriction.js";

export class AvailabilityRestrictionMapping {

    static mapDatabaseEntryToAvailabilityRestriction(availabilityRestrictionEntry) {
        return new PropertyAvailabilityRestriction(
            availabilityRestrictionEntry.id,
            availabilityRestrictionEntry.property_id,
            availabilityRestrictionEntry.restriction,
            availabilityRestrictionEntry.value
        )
    }
}