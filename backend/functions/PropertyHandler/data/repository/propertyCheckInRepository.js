import { CheckInMapping } from "../../util/mapping/checkIn.js";
import Database from "database";
import {Property_Check_In} from "database/models/Property_Check_In";

export class PropertyCheckInRepository {

    constructor(systemManager) {
        this.systemManager = systemManager
    }

    async getPropertyCheckInTimeslotsByPropertyId(id) {
        const client = await Database.getInstance();
        const result = await client
            .getRepository(Property_Check_In)
            .createQueryBuilder("property_checkin")
            .where("property_id = :id", { id: id })
            .getOne();
        return result ? CheckInMapping.mapDatabaseEntryToCheckIn(result) : null;
    }

    async create(timeslots) {
        const client = await Database.getInstance();
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Check_In)
            .values({
                property_id: timeslots.property_id,
                checkinfrom: timeslots.checkIn.from,
                checkintill: timeslots.checkIn.till,
                checkoutfrom: timeslots.checkOut.from,
                checkouttill: timeslots.checkOut.till
            })
            .execute();
        const result = await this.getPropertyCheckInTimeslotsByPropertyId(timeslots.property_id);
        return result ? result : null;
    }

}