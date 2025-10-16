import Database from "database";
import { Property } from "database/models/Property";
import "dotenv/config";
  
export default class PropertyRepository {
  constructor() {}

  async getProperty(property_id) {
    const client = await Database.getInstance();
    const record = await client
      .getRepository(Property)
      .createQueryBuilder("property")
      .where("property.id = :id", { id: property_id })
      .getOne();

    return record;
  }
}