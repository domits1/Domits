import Database from "database";
import { Property_Test_Status } from "database/models/Property_Test_Status";
import { PropertyTestStatusMapping } from "../../util/mapping/propertyTestStatus.js";

export class PropertyTestStatusRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async getPropertyTestStatusByPropertyId(id) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Property_Test_Status)
      .createQueryBuilder("property_test_status")
      .where("property_id = :id", { id: id })
      .getOne();
    return result ? PropertyTestStatusMapping.mapDatabaseEntryToCheckIn(result) : null;
  }

  async create(testStatus) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .insert()
      .into(Property_Test_Status)
      .values({
        property_id: testStatus.property_id,
        isTest: testStatus.isTest,
      })
      .execute();
    const result = await this.getPropertyTestStatusByPropertyId(testStatus.property_id);
    return result ? result : null;
  }
}
