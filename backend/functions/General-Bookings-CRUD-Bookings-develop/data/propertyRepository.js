import Database from "database";
import { Property } from "database/models/Property";
import NotFoundException from "../util/exception/NotFoundException.js";

class PropertyRepository {
  constructor() {}

  async getPropertyById(id) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Property)
      .createQueryBuilder("property")
      .where("property.id = :id", { id: id })
      .getOne();
    if (result) {
      return {
        hostId: result.hostid,
        title: result.title,
      };
    } else {
      throw new NotFoundException("Property is inactive or does not exist.");
    }
  }

  async getCancellationPolicyByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const rule = await client
      .createQueryBuilder()
      .select("pr.rule", "rule")
      .from("property_rule", "pr")
      .where("pr.property_id = :propertyId", { propertyId })
      .andWhere("pr.rule LIKE 'CancellationPolicy:%'")
      .andWhere("pr.value = :value", { value: true })
      .getRawOne();
    return rule ? rule.rule.replace("CancellationPolicy:", "") : null;
  }
}

export default PropertyRepository;
