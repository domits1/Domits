import { RuleMapping } from "../../util/mapping/rule.js";
import Database from "database";
import { Rules } from "database/models/Rules";
import { Property_Rule } from "database/models/Property_Rule";

export class PropertyRuleRepository {
  constructor(dynamoDbClient, systemManager) {
    this.systemManager = systemManager;
  }

  normalizeValueType(valueType) {
    return String(valueType || "").trim().toLowerCase();
  }

  buildTypedRuleValues(ruleDefinition, rawValue) {
    const normalizedValueType = this.normalizeValueType(ruleDefinition?.value_type);

    if (normalizedValueType === "time" || normalizedValueType === "text") {
      return {
        value: false,
        value_new: rawValue == null ? null : String(rawValue),
      };
    }

    return {
      value: rawValue === true || String(rawValue).trim().toLowerCase() === "true",
      value_new: null,
    };
  }

  async getRuleById(id) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Rules)
      .createQueryBuilder("rules")
      .where("rule = :id", { id: id })
      .getOne();
    return result ? result : null;
  }

  async getRulesByPropertyId(id) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Property_Rule)
      .createQueryBuilder("property_rule")
      .where("property_id = :id", { id: id })
      .getMany();
    if (result.length === 0) {
      return [];
    }

    const ruleDefinitions = await client
      .getRepository(Rules)
      .createQueryBuilder("rules")
      .where("rules.rule IN (:...ruleNames)", { ruleNames: result.map((item) => item.rule) })
      .getMany();
    const ruleDefinitionMap = new Map(
      ruleDefinitions.map((ruleDefinition) => [String(ruleDefinition.rule), ruleDefinition])
    );

    return result.map((item) =>
      RuleMapping.mapDatabaseEntryToRule({
        ...item,
        value_type: ruleDefinitionMap.get(String(item.rule))?.value_type,
      })
    );
  }

  async getRuleByPropertyIdAndRule(id, rule) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Property_Rule)
      .createQueryBuilder("property_rule")
      .where("property_id = :id", { id: id })
      .andWhere("rule = :rule", { rule: rule })
      .getOne();
    return result ? result : null;
  }

  async create(rule) {
    const client = await Database.getInstance();
    const ruleDefinition = await this.getRuleById(rule.rule);
    if (!ruleDefinition) {
      throw new Error(`Unknown policy rule: ${rule.rule}`);
    }
    const typedValues = this.buildTypedRuleValues(ruleDefinition, rule.value);

    await client
      .createQueryBuilder()
      .insert()
      .into(Property_Rule)
      .values({
        property_id: rule.property_id,
        rule: rule.rule,
        ...typedValues,
      })
      .execute();
    const result = await this.getRuleByPropertyIdAndRule(rule.property_id, rule.rule);
    return result ? result : null;
  }

  async upsertRuleByPropertyId(propertyId, ruleName, rawValue, transactionManager = null) {
    const client = transactionManager || (await Database.getInstance());
    const ruleDefinition = await client
      .getRepository(Rules)
      .createQueryBuilder("rules")
      .where("rules.rule = :rule", { rule: ruleName })
      .getOne();

    if (!ruleDefinition) {
      throw new Error(`Unknown policy rule: ${ruleName}`);
    }

    const typedValues = this.buildTypedRuleValues(ruleDefinition, rawValue);
    const existingRule = await client
      .getRepository(Property_Rule)
      .createQueryBuilder("property_rule")
      .where("property_rule.property_id = :propertyId", { propertyId })
      .andWhere("property_rule.rule = :rule", { rule: ruleName })
      .getOne();

    if (existingRule) {
      await client
        .createQueryBuilder()
        .update(Property_Rule)
        .set(typedValues)
        .where("property_id = :propertyId AND rule = :rule", { propertyId, rule: ruleName })
        .execute();
    } else {
      await client
        .createQueryBuilder()
        .insert()
        .into(Property_Rule)
        .values({
          property_id: propertyId,
          rule: ruleName,
          ...typedValues,
        })
        .execute();
    }

    return await this.getRuleByPropertyIdAndRule(propertyId, ruleName);
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
          .select(["rules.rule", "rules.value_type"])
          .where("rules.rule IN (:...ruleNames)", { ruleNames: normalizedRuleNames })
          .getMany();
        const ruleDefinitionMap = new Map(
          existingRuleMappings.map((ruleDefinition) => [String(ruleDefinition.rule), ruleDefinition])
        );
        const existingRuleNameSet = new Set(ruleDefinitionMap.keys());
        const invalidRuleNames = normalizedRuleNames.filter((ruleName) => !existingRuleNameSet.has(ruleName));
        if (invalidRuleNames.length > 0) {
          throw new Error(`Unknown policy rules: ${invalidRuleNames.join(", ")}`);
        }

        for (const rule of normalizedRules) {
          const typedValues = this.buildTypedRuleValues(ruleDefinitionMap.get(rule.rule), rule.value);
          const existingRule = await transactionManager
            .getRepository(Property_Rule)
            .createQueryBuilder("property_rule")
            .where("property_rule.property_id = :propertyId", { propertyId })
            .andWhere("property_rule.rule = :rule", { rule: rule.rule })
            .getOne();

          if (existingRule) {
            await transactionManager
              .createQueryBuilder()
              .update(Property_Rule)
              .set(typedValues)
              .where("property_id = :propertyId AND rule = :rule", { propertyId, rule: rule.rule })
              .execute();
          } else {
            await transactionManager
              .createQueryBuilder()
              .insert()
              .into(Property_Rule)
              .values({
                property_id: propertyId,
                rule: rule.rule,
                ...typedValues,
              })
              .execute();
          }
        }
      }

      const updatedRules = await transactionManager
        .getRepository(Property_Rule)
        .createQueryBuilder("property_rule")
        .where("property_id = :id", { id: propertyId })
        .getMany();

      if (updatedRules.length === 0) {
        return [];
      }

      const ruleDefinitions = await transactionManager
        .getRepository(Rules)
        .createQueryBuilder("rules")
        .where("rules.rule IN (:...ruleNames)", { ruleNames: updatedRules.map((item) => item.rule) })
        .getMany();
      const ruleDefinitionMap = new Map(
        ruleDefinitions.map((ruleDefinition) => [String(ruleDefinition.rule), ruleDefinition])
      );

      return updatedRules.map((item) =>
        RuleMapping.mapDatabaseEntryToRule({
          ...item,
          value_type: ruleDefinitionMap.get(String(item.rule))?.value_type,
        })
      );
    });
  }
}
