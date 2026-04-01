import { CheckInMapping } from "../../util/mapping/checkIn.js";
import Database from "database";
import { Property_Check_In } from "database/models/Property_Check_In";

export class PropertyCheckInRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
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
        checkInFrom: timeslots.checkIn.from,
        checkInTill: timeslots.checkIn.till,
        checkOutFrom: timeslots.checkOut.from,
        checkOutTill: timeslots.checkOut.till,
      })
      .execute();
    const result = await this.getPropertyCheckInTimeslotsByPropertyId(timeslots.property_id);
    return result ? result : null;
  }

  async updateCheckIn(propertyId, checkInData) {
    const client = await Database.getInstance();
    const existing = await client
      .getRepository(Property_Check_In)
      .createQueryBuilder("property_checkin")
      .where("property_id = :id", { id: propertyId })
      .getOne();
    const valuesToSet = {
      checkinfrom: checkInData.checkIn?.from,
      checkintill: checkInData.checkIn?.till,
      checkoutfrom: checkInData.checkOut?.from,
      checkouttill: checkInData.checkOut?.till,
    };

    if (existing) {
      await client
        .createQueryBuilder()
        .update(Property_Check_In)
        .set(valuesToSet)
        .where("property_id = :propertyId", { propertyId })
        .execute();
    } else {
      await client
        .createQueryBuilder()
        .insert()
        .into(Property_Check_In)
        .values({
          property_id: propertyId,
          ...valuesToSet,
        })
        .execute();
    }

    const final = await this.getPropertyCheckInTimeslotsByPropertyId(propertyId);
    return final;
  }
}
