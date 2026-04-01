import Database from "database";
import { Property_CustomRule } from "database/models/Property_CustomRule";
import { v4 as uuidv4 } from "uuid";

export class PropertyCustomRuleRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async getCustomRulesByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const results = await client
      .getRepository(Property_CustomRule)
      .createQueryBuilder("rule")
      .where("rule.property_id = :propertyId", { propertyId })
      .orderBy("rule.category", "ASC")
      .addOrderBy("rule.created_at", "ASC")
      .getMany();
    return results || [];
  }

  async replaceCustomRulesByPropertyId(propertyId, customRules) {
    const client = await Database.getInstance();
    const now = Date.now();

    await client
      .createQueryBuilder()
      .delete()
      .from(Property_CustomRule)
      .where("property_id = :propertyId", { propertyId })
      .execute();

    if (Array.isArray(customRules) && customRules.length > 0) {
      const rulesToInsert = customRules.map((rule) => ({
        id: uuidv4(),
        property_id: propertyId,
        category: rule.category || "property",
        rule_text: rule.rule_text || rule.text || "",
        enabled: rule.enabled !== false,
        created_at: now,
      }));

      if (rulesToInsert.length > 0) {
        await client.createQueryBuilder().insert().into(Property_CustomRule).values(rulesToInsert).execute();
      }
    }

    return await this.getCustomRulesByPropertyId(propertyId);
  }
}
