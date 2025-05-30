import { PropertyTechnicalDetails } from "../../business/model/propertyTechnicalDetails.js";

export class TechnicalDetailsMapping {

    static mapDatabaseEntryToTechnicalDetails(TechnicalDetailsEntry) {
        return new PropertyTechnicalDetails({
            property_id: TechnicalDetailsEntry.property_id.S,
            length: parseFloat(TechnicalDetailsEntry.length.N),
            height: parseFloat(TechnicalDetailsEntry.height.N),
            fuelConsumption: parseFloat(TechnicalDetailsEntry.fuelConsumption.N),
            speed: parseFloat(TechnicalDetailsEntry.speed.N),
            renovationYear: parseFloat(TechnicalDetailsEntry.renovationYear.N),
            transmission: TechnicalDetailsEntry.transmission.S,
            generalPeriodicInspection: parseFloat(TechnicalDetailsEntry.generalPeriodicInspection.N),
            fourWheelDrive: TechnicalDetailsEntry.fourWheelDrive.BOOL
        })
    }
}