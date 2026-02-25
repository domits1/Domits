import Database from "database";
import { Property } from "database/models/Property";
import { Property_Image_Legacy } from "database/models/Property_Image_Legacy";
import { Property_Image } from "database/models/Property_Image";
import { Property_Image_Variant } from "database/models/Property_Image_Variant";
import "dotenv/config";
  
export default class PropertyRepository {
  constructor() {}

  async getProperty(property_id) {
    const client = await Database.getInstance();
    const record = await client
    .getRepository(Property)
    .createQueryBuilder("property")
    .leftJoin(Property_Image, "image", "image.property_id = property.id")
    .leftJoin(Property_Image_Variant, "variant", "variant.image_id = image.id AND variant.variant = 'web'")
    .leftJoin(Property_Image_Legacy, "legacy", "legacy.property_id = property.id")
    .where("property.id = :id", { id: property_id })
    .select([
        "property.title AS title",
        "COALESCE(variant.s3_key, legacy.key) AS key",
    ])
    .getRawOne();

    return record;
  }
}