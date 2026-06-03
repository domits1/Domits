import { TechnicalDetailsMapping } from "../../util/mapping/technicalDetail.js";
import Database from "database";
import {
    Property_Technical_Details,
    PROPERTY_TECHNICAL_DETAILS_TABLE_NAMES
} from "database/models/Property_Technical_Details";

const TECHNICAL_DETAILS_TABLE = PROPERTY_TECHNICAL_DETAILS_TABLE_NAMES.current;
const TECHNICAL_DETAILS_COLUMNS = Object.freeze({
    propertyId: "property_id",
    length: "length",
    height: "height",
    fuelConsumption: "fuelconsumption",
    speed: "speed",
    renovationYear: "renovationyear",
    transmission: "transmission",
    generalPeriodicInspection: "generalperiodicinspection",
    fourWheelDrive: "fourwheeldrive"
});

export class PropertyTechnicalDetailRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }

    async getTechnicalDetailsByPropertyId(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Technical_Details)
            .createQueryBuilder(TECHNICAL_DETAILS_TABLE)
            .where(`${TECHNICAL_DETAILS_COLUMNS.propertyId} = :id`, { id: id })
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
                [TECHNICAL_DETAILS_COLUMNS.propertyId]: details.property_id,
                [TECHNICAL_DETAILS_COLUMNS.length]: details.length,
                [TECHNICAL_DETAILS_COLUMNS.height]: details.height,
                [TECHNICAL_DETAILS_COLUMNS.fuelConsumption]: details.fuelConsumption,
                [TECHNICAL_DETAILS_COLUMNS.speed]: details.speed,
                [TECHNICAL_DETAILS_COLUMNS.renovationYear]: details.renovationYear,
                [TECHNICAL_DETAILS_COLUMNS.transmission]: details.transmission,
                [TECHNICAL_DETAILS_COLUMNS.generalPeriodicInspection]: details.generalPeriodicInspection,
                [TECHNICAL_DETAILS_COLUMNS.fourWheelDrive]: details.fourWheelDrive
            })
            .execute();
        const result = await this.getTechnicalDetailsByPropertyId(details.property_id);
        return result ? result : null;
    }

}
