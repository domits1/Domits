import { PropertyTechnicalDetails } from "../../business/model/propertyTechnicalDetails.js";

export class TechnicalDetailsMapping {

    static mapDatabaseEntryToTechnicalDetails(TechnicalDetailsEntry) {
        return new PropertyTechnicalDetails({
            property_id: TechnicalDetailsEntry.property_id,
            length: TechnicalDetailsEntry.length,
            height: TechnicalDetailsEntry.height,
            fuelConsumption: TechnicalDetailsEntry.fuelconsumption,
            speed: TechnicalDetailsEntry.speed,
            renovationYear: TechnicalDetailsEntry.renovationyear,
            transmission: TechnicalDetailsEntry.transmission,
            generalPeriodicInspection: TechnicalDetailsEntry.generalperiodicinspection,
            fourWheelDrive: TechnicalDetailsEntry.fourwheeldrive
        })
    }
}