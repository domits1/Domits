import Database from "database";
import { Host_Notification_Preferences } from "database/models/Host_Notification_Preferences";

// Lambda packages cannot import repositories from sibling function directories.
export class ReviewAlertPreferencesRepository {
  async findByUserId(userId) {
    const database = await Database.getInstance();
    return database.getRepository(Host_Notification_Preferences).findOne({ where: { user_id: userId } });
  }
}
