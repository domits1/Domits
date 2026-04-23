import { RuleMapping } from "../../util/mapping/rule.js";
import Database from "database";
import { Rules } from "database/models/Rules";
import { Property_Rule } from "database/models/Property_Rule";

export class PropertyRuleRepository {
  constructor(dynamoDbClient, systemManager) {
    this.systemManager = systemManager;
  }

  async getRuleById(id) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Rules)
      .createQueryBuilder("rules")
      .where("rule = :id", { id: id })
      .getOne();
    return result ?? null;
  }

  async getRulesByPropertyId(id) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Property_Rule)
      .createQueryBuilder("property_rule")
      .where("property_id = :id", { id: id })
      .getMany();
    return result.length > 0 ? result.map((item) => RuleMapping.mapDatabaseEntryToRule(item)) : [];
  }

  async getRuleByPropertyIdAndRule(id, rule) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Property_Rule)
      .createQueryBuilder("property_rule")
      .where("property_id = :id", { id: id })
      .andWhere("rule = :rule", { rule: rule })
      .getOne();
    return result ?? null;
  }

  #determineValueType(rule) {
    if (rule.value_text) {
      return "string";
    }
    if (typeof rule.value === "boolean" || typeof rule.value === "number") {
      return "boolean";
    }
    return null;
  }

  async create(rule) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .insert()
      .into(Property_Rule)
      .values({
        property_id: rule.property_id,
        rule: rule.rule,
        value: rule.value ?? null,
        value_text: rule.value_text ?? null,
        value_type: rule.value_type ?? this.#determineValueType(rule),
      })
      .execute();
    const result = await this.getRuleByPropertyIdAndRule(rule.property_id, rule.rule);
    return result ?? null;
  }

  async replaceRulesByPropertyId(propertyId, rules) {
    const client = await Database.getInstance();
    const normalizedRules = Array.from(
      new Map(
        (Array.isArray(rules) ? rules : [])
          .map((rule) => ({
            rule: String(rule?.rule || "").trim(),
            value: rule?.value,
          }))
          .filter((rule) => rule.rule)
          .map((rule) => [rule.rule, rule])
      ).values()
    );

    return await client.transaction(async (transactionManager) => {
      if (normalizedRules.length > 0) {
        const normalizedRuleNames = normalizedRules.map((rule) => rule.rule);
        const existingRuleMappings = await transactionManager
          .getRepository(Rules)
          .createQueryBuilder("rules")
          .select(["rules.rule"])
          .where("rules.rule IN (:...ruleNames)", { ruleNames: normalizedRuleNames })
          .getMany();
        const existingRuleNameSet = new Set(existingRuleMappings.map((rule) => String(rule.rule)));
        const invalidRuleNames = normalizedRuleNames.filter((ruleName) => !existingRuleNameSet.has(ruleName));
        if (invalidRuleNames.length > 0) {
          throw new Error(`Unknown policy rules: ${invalidRuleNames.join(", ")}`);
        }

        await transactionManager
          .createQueryBuilder()
          .delete()
          .from(Property_Rule)
          .where("property_id = :propertyId", { propertyId })
          .andWhere("rule IN (:...ruleNames)", { ruleNames: normalizedRuleNames })
          .execute();

        await transactionManager
          .createQueryBuilder()
          .insert()
          .into(Property_Rule)
          .values(
            normalizedRules.map((rule) => ({
              property_id: propertyId,
              rule: rule.rule,
              value: rule.value ?? null,
              value_text: rule.value_text ?? null,
              value_type: rule.value_type ?? this.#determineValueType(rule),
            }))
          )
          .execute();
      }

      const updatedRules = await transactionManager
        .getRepository(Property_Rule)
        .createQueryBuilder("property_rule")
        .where("property_id = :id", { id: propertyId })
        .getMany();

      return updatedRules.length > 0 ? updatedRules.map((item) => RuleMapping.mapDatabaseEntryToRule(item)) : [];
    });
  }
}
