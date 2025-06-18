import { TechnicalDetailsMapping } from "../../util/mapping/technicalDetail.js";
import Database from "database";
import {Property_Technical_Details} from "database/models/Property_Technical_Details";

export class PropertyTechnicalDetailRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }

    async getTechnicalDetailsByPropertyId(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Technical_Details)
            .createQueryBuilder("property_technicaldetails")
            .where("property_id = :id", { id: id })
            .getOne();
        return result ? TechnicalDetailsMapping.mapDatabaseEntryToTechnicalDetails(result) : null;
    }

    async create(details) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Technical_Details)
            .values({
                property_id: details.property_id,
                length: details.length,
                height: details.height,
                fuelconsumption: details.fuelConsumption,
                speed: details.speed,
                renovationyear: details.renovationYear,
                transmission: details.transmission,
                generalperiodicinspection: details.generalPeriodicInspection,
                fourwheeldrive: details.fourWheelDrive
            })
            .execute();
        const result = await this.getTechnicalDetailsByPropertyId(details.property_id);
        return result ? result : null;
    }

}