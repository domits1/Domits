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

    async upsertPropertyCheckInByPropertyId(propertyId, timeslots) {
        const client = await Database.getInstance();
        const existing = await this.getPropertyCheckInTimeslotsByPropertyId(propertyId);
        const normalizedCheckIn = {
            property_id: propertyId,
            checkIn: {
                from: timeslots?.checkIn?.from,
                till: timeslots?.checkIn?.till,
            },
            checkOut: {
                from: timeslots?.checkOut?.from,
                till: timeslots?.checkOut?.till,
            },
        };

        if (existing) {
            await client
                .createQueryBuilder()
                .update(Property_Check_In)
                .set({
                    checkinfrom: normalizedCheckIn.checkIn.from,
                    checkintill: normalizedCheckIn.checkIn.till,
                    checkoutfrom: normalizedCheckIn.checkOut.from,
                    checkouttill: normalizedCheckIn.checkOut.till,
                })
                .where("property_id = :propertyId", { propertyId })
                .execute();
        } else {
            await client
                .createQueryBuilder()
                .insert()
                .into(Property_Check_In)
                .values({
                    property_id: normalizedCheckIn.property_id,
                    checkinfrom: normalizedCheckIn.checkIn.from,
                    checkintill: normalizedCheckIn.checkIn.till,
                    checkoutfrom: normalizedCheckIn.checkOut.from,
                    checkouttill: normalizedCheckIn.checkOut.till,
                })
                .execute();
        }

        return await this.getPropertyCheckInTimeslotsByPropertyId(propertyId);
    }

}