import Database from "database";
import { Property_LateCheckin } from "database/models/Property_LateCheckin";

export class PropertyLateCheckinRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async getLateCheckinByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Property_LateCheckin)
      .createQueryBuilder("late_checkin")
      .where("late_checkin.property_id = :propertyId", { propertyId })
      .getOne();
    return result || null;
  }

  async updateLateCheckin(propertyId, lateCheckinData) {
    const client = await Database.getInstance();
    const now = Date.now();

    const existing = await this.getLateCheckinByPropertyId(propertyId);

    const valuesToSet = {
      late_checkin_enabled: lateCheckinData.late_checkin_enabled || false,
      late_checkin_time: lateCheckinData.late_checkin_time || null,
      late_checkout_enabled: lateCheckinData.late_checkout_enabled || false,
      late_checkout_time: lateCheckinData.late_checkout_time || null,
      updated_at: now,
    };

    if (existing) {
      await client
        .createQueryBuilder()
        .update(Property_LateCheckin)
        .set(valuesToSet)
        .where("property_id = :propertyId", { propertyId })
        .execute();
    } else {
      await client
        .createQueryBuilder()
        .insert()
        .into(Property_LateCheckin)
        .values({
          property_id: propertyId,
          ...valuesToSet,
          created_at: now,
        })
        .execute();
    }

    return await this.getLateCheckinByPropertyId(propertyId);
  }
}
