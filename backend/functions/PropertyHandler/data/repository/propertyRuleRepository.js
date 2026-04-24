import { RuleMapping } from "../../util/mapping/rule.js";
import Database from "database";
import { Property_Rule } from "database/models/Property_Rule";

const RULE_VALUE_TYPE_OVERRIDES = Object.freeze({
  "CancellationPolicy:Firm": "text",
  "CancellationPolicy:Flexible": "text",
  "CancellationPolicy:Moderate": "text",
  "CancellationPolicy:Strict": "text",
  CheckInFrom: "time",
  CheckInTill: "time",
  CheckOutFrom: "time",
  CheckOutTill: "time",
  LateCheckinEnabled: "boolean",
  LateCheckinTime: "time",
  LateCheckoutEnabled: "boolean",
  LateCheckoutTime: "time",
});

export class PropertyRuleRepository {
  constructor(dynamoDbClient, systemManager) {
    this.systemManager = systemManager;
    this.propertyRuleHasValueNew = undefined;
  }

  normalizeValueType(valueType) {
    return String(valueType || "").trim().toLowerCase();
  }

  resolveRuleValueType(ruleName, valueType) {
    const normalizedValueType = this.normalizeValueType(valueType);
    if (normalizedValueType) {
      return normalizedValueType;
    }
    return this.normalizeValueType(RULE_VALUE_TYPE_OVERRIDES[String(ruleName)] || "");
  }

  buildTypedRuleValues(ruleDefinition, rawValue) {
    const normalizedValueType = this.resolveRuleValueType(ruleDefinition?.rule, ruleDefinition?.value_type);

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

  mapPropertyRuleRow(row, ruleDefinitionMap) {
    return RuleMapping.mapDatabaseEntryToRule({
      property_id: row.property_id,
      rule: row.rule,
      value: row.value === true || row.value === "true",
      value_new: row.value_new ?? null,
      value_type: this.resolveRuleValueType(row.rule, ruleDefinitionMap.get(String(row.rule))?.value_type),
    });
  }

  async detectValueNewSupport(client) {
    if (this.propertyRuleHasValueNew !== undefined) {
      return this.propertyRuleHasValueNew;
    }

    if (typeof client.createQueryBuilder !== "function") {
      this.propertyRuleHasValueNew = false;
      return this.propertyRuleHasValueNew;
    }

    try {
      await client
        .createQueryBuilder()
        .select("property_rule.value_new", "value_new")
        .from("property_rule", "property_rule")
        .where("1 = 0")
        .getRawMany();
      this.propertyRuleHasValueNew = true;
    } catch {
      this.propertyRuleHasValueNew = false;
    }

    return this.propertyRuleHasValueNew;
  }

  async getRuleDefinitionsByNames(client, ruleNames) {
    const normalizedRuleNames = Array.from(new Set((ruleNames || []).map((ruleName) => String(ruleName)).filter(Boolean)));
    if (normalizedRuleNames.length === 0) {
      return new Map();
    }

    if (typeof client.createQueryBuilder === "function") {
      try {
        const rows = await client
          .createQueryBuilder()
          .select("rules.rule", "rule")
          .addSelect("rules.value_type", "value_type")
          .from("rules", "rules")
          .where("rules.rule IN (:...ruleNames)", { ruleNames: normalizedRuleNames })
          .getRawMany();

        return new Map(
          rows.map((row) => [
            String(row.rule),
            {
              rule: row.rule,
              value_type: this.resolveRuleValueType(row.rule, row.value_type),
            },
          ])
        );
      } catch {
        const rows = await client
          .createQueryBuilder()
          .select("rules.rule", "rule")
          .from("rules", "rules")
          .where("rules.rule IN (:...ruleNames)", { ruleNames: normalizedRuleNames })
          .getRawMany();

        return new Map(
          rows.map((row) => [
            String(row.rule),
            {
              rule: row.rule,
              value_type: this.resolveRuleValueType(row.rule),
            },
          ])
        );
      }
    }

    const rows = await Promise.all(normalizedRuleNames.map(async (ruleName) => await this.getRuleById(ruleName)));
    return new Map(rows.filter(Boolean).map((row) => [String(row.rule), row]));
  }

  async getRuleById(id) {
    const client = await Database.getInstance();

    if (typeof client.createQueryBuilder === "function") {
      try {
        const row = await client
          .createQueryBuilder()
          .select("rules.rule", "rule")
          .addSelect("rules.value_type", "value_type")
          .from("rules", "rules")
          .where("rules.rule = :id", { id })
          .getRawOne();

        return row
          ? {
              rule: row.rule,
              value_type: this.resolveRuleValueType(row.rule, row.value_type),
            }
          : null;
      } catch {
        const row = await client
          .createQueryBuilder()
          .select("rules.rule", "rule")
          .from("rules", "rules")
          .where("rules.rule = :id", { id })
          .getRawOne();

        return row
          ? {
              rule: row.rule,
              value_type: this.resolveRuleValueType(row.rule),
            }
          : null;
      }
    }

    const repository = client.getRepository?.("rules") || client.getRepository?.(Property_Rule);
    const result = await repository?.createQueryBuilder?.("rules").where("rule = :id", { id }).getOne();
    return result
      ? {
          rule: result.rule ?? id,
          value_type: this.resolveRuleValueType(result.rule ?? id, result.value_type),
        }
      : null;
  }

  async getRulesByPropertyId(id) {
    const client = await Database.getInstance();
    const supportsValueNew = await this.detectValueNewSupport(client);

    const query = client
      .createQueryBuilder()
      .select("property_rule.property_id", "property_id")
      .addSelect("property_rule.rule", "rule")
      .addSelect("property_rule.value", "value")
      .from("property_rule", "property_rule")
      .where("property_rule.property_id = :id", { id });

    if (supportsValueNew) {
      query.addSelect("property_rule.value_new", "value_new");
    }

    const rows = await query.getRawMany();
    if (rows.length === 0) {
      return [];
    }

    const ruleDefinitionMap = await this.getRuleDefinitionsByNames(client, rows.map((row) => row.rule));
    return rows.map((row) => this.mapPropertyRuleRow(row, ruleDefinitionMap));
  }

  async getRuleByPropertyIdAndRule(id, rule) {
    const client = await Database.getInstance();
    const supportsValueNew = await this.detectValueNewSupport(client);

    const query = client
      .createQueryBuilder()
      .select("property_rule.property_id", "property_id")
      .addSelect("property_rule.rule", "rule")
      .addSelect("property_rule.value", "value")
      .from("property_rule", "property_rule")
      .where("property_rule.property_id = :id", { id })
      .andWhere("property_rule.rule = :rule", { rule });

    if (supportsValueNew) {
      query.addSelect("property_rule.value_new", "value_new");
    }

    const row = await query.getRawOne();
    if (!row) {
      return null;
    }

    const ruleDefinitionMap = await this.getRuleDefinitionsByNames(client, [row.rule]);
    return this.mapPropertyRuleRow(row, ruleDefinitionMap);
  }

  async create(rule) {
    const client = await Database.getInstance();
    const ruleDefinition = await this.getRuleById(rule.rule);
    if (!ruleDefinition) {
      throw new Error(`Unknown policy rule: ${rule.rule}`);
    }

    const typedValues = this.buildTypedRuleValues(ruleDefinition, rule.value);
    const valuesToInsert = {
      property_id: rule.property_id,
      rule: rule.rule,
      value: typedValues.value,
    };

    if (await this.detectValueNewSupport(client)) {
      valuesToInsert.value_new = typedValues.value_new;
    }

    await client.createQueryBuilder().insert().into(Property_Rule).values(valuesToInsert).execute();
    return await this.getRuleByPropertyIdAndRule(rule.property_id, rule.rule);
  }

  async upsertRuleByPropertyId(propertyId, ruleName, rawValue, transactionManager = null) {
    const client = transactionManager || (await Database.getInstance());
    const ruleDefinition = await this.getRuleById(ruleName);

    if (!ruleDefinition) {
      throw new Error(`Unknown policy rule: ${ruleName}`);
    }

    const typedValues = this.buildTypedRuleValues(ruleDefinition, rawValue);
    const valuesToPersist = { value: typedValues.value };
    if (await this.detectValueNewSupport(client)) {
      valuesToPersist.value_new = typedValues.value_new;
    }

    const existingRule = await this.getRuleByPropertyIdAndRule(propertyId, ruleName);

    if (existingRule) {
      await client
        .createQueryBuilder()
        .update(Property_Rule)
        .set(valuesToPersist)
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
          ...valuesToPersist,
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
        const ruleDefinitionMap = await this.getRuleDefinitionsByNames(
          transactionManager,
          normalizedRules.map((rule) => rule.rule)
        );
        const invalidRuleNames = normalizedRules
          .map((rule) => rule.rule)
          .filter((ruleName) => !ruleDefinitionMap.has(ruleName));

        if (invalidRuleNames.length > 0) {
          throw new Error(`Unknown policy rules: ${invalidRuleNames.join(", ")}`);
        }

        const supportsValueNew = await this.detectValueNewSupport(transactionManager);

        for (const rule of normalizedRules) {
          const typedValues = this.buildTypedRuleValues(ruleDefinitionMap.get(rule.rule), rule.value);
          const valuesToPersist = { value: typedValues.value };
          if (supportsValueNew) {
            valuesToPersist.value_new = typedValues.value_new;
          }

          const existingRule = await this.getRuleByPropertyIdAndRule(propertyId, rule.rule);

          if (existingRule) {
            await transactionManager
              .createQueryBuilder()
              .update(Property_Rule)
              .set(valuesToPersist)
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
                ...valuesToPersist,
              })
              .execute();
          }
        }
      }

      return await this.getRulesByPropertyId(propertyId);
    });
  }
}
