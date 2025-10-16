import Database from "database";
import { Property } from "database/models/Property";
import { Property_Image } from "database/models/Property_Image";
import "dotenv/config";
  
export default class PropertyRepository {
  constructor() {}

  async getProperty(property_id) {
    const client = await Database.getInstance();
    const record = await client
    .getRepository(Property)
    .createQueryBuilder("property")
    .leftJoin("property_image", "image", "image.property_id = property.id")
    .where("property.id = :id", { id: property_id })
    .select([
        "property.id",
        "property.updatedat",
        "property.title",
        "property.subtitle",
        "property.description",
        "property.registrationnumber",
        "property.hostid",
        "property.status",
        "property.createdat",
        "image.key",
    ])
    .getRawOne();

    return record;
  }
}