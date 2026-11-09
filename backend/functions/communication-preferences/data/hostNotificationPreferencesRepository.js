import Database from "database";
import { Host_Notification_Preferences } from "database/models/Host_Notification_Preferences";

export class HostNotificationPreferencesRepository {
  async findByUserId(userId) {
    const dataSource = await Database.getInstance();
    return await dataSource
      .getRepository(Host_Notification_Preferences)
      .findOne({ where: { user_id: userId } });
  }

  async save(record) {
    const dataSource = await Database.getInstance();
    return await dataSource
      .getRepository(Host_Notification_Preferences)
      .save(record);
  }
}
