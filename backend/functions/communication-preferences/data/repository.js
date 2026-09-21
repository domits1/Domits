import Database from "database";
import { Communication_Preferences } from "database/models/Communication_Preferences";

export class CommunicationPreferencesRepository {
  async findByUserIdAndPersona(userId, persona) {
    const dataSource = await Database.getInstance();
    return await dataSource
      .getRepository(Communication_Preferences)
      .findOne({ where: { user_id: userId, persona } });
  }

  async save(record) {
    const dataSource = await Database.getInstance();
    return await dataSource
      .getRepository(Communication_Preferences)
      .save(record);
  }
}
