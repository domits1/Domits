import Database from "database";
import { Property_HouseRule } from "database/models/Property_HouseRule";

export class PropertyHouseRuleRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async getHouseRulesByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const results = await client
      .getRepository(Property_HouseRule)
      .createQueryBuilder("rule")
      .where("rule.property_id = :propertyId", { propertyId })
      .orderBy("rule.created_at", "ASC")
      .getMany();
    return results || [];
  }

  async replaceHouseRulesByPropertyId(propertyId, houseRules) {
    const client = await Database.getInstance();
    const now = Date.now();

    await client
      .createQueryBuilder()
      .delete()
      .from(Property_HouseRule)
      .where("property_id = :propertyId", { propertyId })
      .execute();

    if (Array.isArray(houseRules) && houseRules.length > 0) {
      const rulesToInsert = houseRules.map((rule) => ({
        id: crypto.randomUUID(),
        property_id: propertyId,
        rule_text: rule.rule_text || rule.text || "",
        enabled: rule.enabled !== false,
        created_at: now,
      }));

      if (rulesToInsert.length > 0) {
        await client.createQueryBuilder().insert().into(Property_HouseRule).values(rulesToInsert).execute();
      }
    }

    return await this.getHouseRulesByPropertyId(propertyId);
  }
}
