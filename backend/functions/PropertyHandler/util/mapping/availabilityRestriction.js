import { PropertyAvailabilityRestriction } from "../../business/model/propertyAvailabilityRestriction.js";

export class AvailabilityRestrictionMapping {

    static mapDatabaseEntryToAvailabilityRestriction(availabilityRestrictionEntry) {
        return new PropertyAvailabilityRestriction(
            availabilityRestrictionEntry.id.S,
            availabilityRestrictionEntry.property_id.S,
            availabilityRestrictionEntry.restriction.S,
            parseFloat(availabilityRestrictionEntry.value.N),
        )
    }
}