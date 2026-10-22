import Database from "database";
import { Property } from "database/models/Property";
import { Property_Location } from "database/models/Property_Location";
import { Property_Image } from "database/models/Property_Image";
import { Property_Image_Variant } from "database/models/Property_Image_Variant";

export class ReviewInvitationRepository {
  async getDetails(propertyId) {
    const db = await Database.getInstance();
    const [property, location, variant] = await Promise.all([
      db.getRepository(Property).findOne({ where: { id: propertyId }, select: ["title"] }),
      db.getRepository(Property_Location).findOne({ where: { property_id: propertyId }, select: ["city"] }),
      db.getRepository(Property_Image).createQueryBuilder("image")
        .innerJoin(Property_Image_Variant, "variant", "variant.image_id = image.id AND variant.variant = :variant", { variant: "web" })
        .select("variant.s3_key", "s3_key")
        .where("image.property_id = :propertyId", { propertyId })
        .andWhere("image.status = :status", { status: "READY" })
        .andWhere("TRIM(variant.s3_key) <> ''")
        .orderBy("image.sort_order", "ASC")
        .addOrderBy("image.id", "ASC")
        .addOrderBy("variant.id", "ASC")
        .limit(1)
        .getRawOne(),
    ]);
    return { propertyTitle: property?.title, city: location?.city, imageKey: variant?.s3_key };
  }
}
