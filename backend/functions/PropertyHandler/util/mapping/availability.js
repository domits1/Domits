import { PropertyAvailability } from "../../business/model/propertyAvailability.js";

export class AvailabilityMapping {

    static mapDatabaseEntryToAvailability(availabilityEntry) {
        return new PropertyAvailability(
            availabilityEntry.property_id.S,
            parseFloat(availabilityEntry.availableStartDate.N),
            parseFloat(availabilityEntry.availableEndDate.N),
        )
    }
}