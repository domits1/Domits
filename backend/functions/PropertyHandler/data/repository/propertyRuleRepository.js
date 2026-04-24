import { RuleMapping } from "../../util/mapping/rule.js";
import Database from "database";
import { Property_Rule } from "database/models/Property_Rule";

export class PropertyRuleRepository {
  constructor(dynamoDbClient, systemManager) {
    this.systemManager = systemManager;
    this.columnCache = new Map();
  }

  async getTableColumns(client, tableName) {
    const cacheKey = tableName;
    if (this.columnCache.has(cacheKey)) {
      return this.columnCache.get(cacheKey);
    }

    const rows = await client.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
      `,
      [tableName]
    );
    const columnSet = new Set(rows.map((row) => String(row.column_name)));
    this.columnCache.set(cacheKey, columnSet);
    return columnSet;
  }

  normalizeValueType(valueType) {
    return String(valueType || "").trim().toLowerCase();
  }

  async getRuleDefinitionColumns(client) {
    return await this.getTableColumns(client, "rules");
  }

  async getPropertyRuleColumns(client) {
    return await this.getTableColumns(client, "property_rule");
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

  sanitizePropertyRuleValues(typedValues, propertyRuleColumns) {
    const sanitizedValues = { value: typedValues.value };

    if (propertyRuleColumns.has("value_new")) {
      sanitizedValues.value_new = typedValues.value_new ?? null;
    }

    return sanitizedValues;
  }

  mapPropertyRuleRow(row, ruleDefinitionMap) {
    return RuleMapping.mapDatabaseEntryToRule({
      property_id: row.property_id,
      rule: row.rule,
      value: row.value === true || row.value === "true",
      value_new: row.value_new ?? null,
      value_type: ruleDefinitionMap.get(String(row.rule))?.value_type,
    });
  }

  async getRuleDefinitionsByNames(client, ruleNames) {
    const normalizedRuleNames = Array.from(new Set((ruleNames || []).map((ruleName) => String(ruleName)).filter(Boolean)));
    if (normalizedRuleNames.length === 0) {
      return new Map();
    }

    const ruleDefinitionColumns = await this.getRuleDefinitionColumns(client);
    const query = client
      .createQueryBuilder()
      .select("rules.rule", "rule")
      .from("rules", "rules")
      .where("rules.rule IN (:...ruleNames)", { ruleNames: normalizedRuleNames });

    if (ruleDefinitionColumns.has("value_type")) {
      query.addSelect("rules.value_type", "value_type");
    }

    const rows = await query.getRawMany();
    return new Map(
      rows.map((row) => [
        String(row.rule),
        {
          rule: row.rule,
          value_type: row.value_type,
        },
      ])
    );
  }

  async getRuleById(id) {
    const client = await Database.getInstance();
    const ruleDefinitionColumns = await this.getRuleDefinitionColumns(client);
    const query = client
      .createQueryBuilder()
      .select("rules.rule", "rule")
      .from("rules", "rules")
      .where("rules.rule = :id", { id });

    if (ruleDefinitionColumns.has("value_type")) {
      query.addSelect("rules.value_type", "value_type");
    }

    const row = await query.getRawOne();
    return row ? row : null;
  }

  async getRulesByPropertyId(id) {
    const client = await Database.getInstance();
    const propertyRuleColumns = await this.getPropertyRuleColumns(client);
    const query = client
      .createQueryBuilder()
      .select("property_rule.property_id", "property_id")
      .addSelect("property_rule.rule", "rule")
      .addSelect("property_rule.value", "value")
      .from("property_rule", "property_rule")
      .where("property_rule.property_id = :id", { id });

    if (propertyRuleColumns.has("value_new")) {
      query.addSelect("property_rule.value_new", "value_new");
    }

    const rows = await query.getRawMany();
    if (rows.length === 0) {
      return [];
    }

    const ruleDefinitionMap = await this.getRuleDefinitionsByNames(
      client,
      rows.map((row) => row.rule)
    );

    return rows.map((row) => this.mapPropertyRuleRow(row, ruleDefinitionMap));
  }

  async getRuleByPropertyIdAndRule(id, rule) {
    const client = await Database.getInstance();
    const propertyRuleColumns = await this.getPropertyRuleColumns(client);
    const query = client
      .createQueryBuilder()
      .select("property_rule.property_id", "property_id")
      .addSelect("property_rule.rule", "rule")
      .addSelect("property_rule.value", "value")
      .from("property_rule", "property_rule")
      .where("property_rule.property_id = :id", { id })
      .andWhere("property_rule.rule = :rule", { rule });

    if (propertyRuleColumns.has("value_new")) {
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

    const propertyRuleColumns = await this.getPropertyRuleColumns(client);
    const sanitizedValues = this.sanitizePropertyRuleValues(
      this.buildTypedRuleValues(ruleDefinition, rule.value),
      propertyRuleColumns
    );

    await client
      .createQueryBuilder()
      .insert()
      .into(Property_Rule)
      .values({
        property_id: rule.property_id,
        rule: rule.rule,
        ...sanitizedValues,
      })
      .execute();
    return await this.getRuleByPropertyIdAndRule(rule.property_id, rule.rule);
  }

  async upsertRuleByPropertyId(propertyId, ruleName, rawValue, transactionManager = null) {
    const client = transactionManager || (await Database.getInstance());
    const propertyRuleColumns = await this.getPropertyRuleColumns(client);
    const ruleDefinition = await this.getRuleById(ruleName);

    if (!ruleDefinition) {
      throw new Error(`Unknown policy rule: ${ruleName}`);
    }

    const typedValues = this.sanitizePropertyRuleValues(
      this.buildTypedRuleValues(ruleDefinition, rawValue),
      propertyRuleColumns
    );
    const existingRule = await this.getRuleByPropertyIdAndRule(propertyId, ruleName);

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
        const propertyRuleColumns = await this.getPropertyRuleColumns(transactionManager);
        const ruleDefinitionMap = await this.getRuleDefinitionsByNames(
          transactionManager,
          normalizedRules.map((rule) => rule.rule)
        );
        const existingRuleNameSet = new Set(ruleDefinitionMap.keys());
        const invalidRuleNames = normalizedRules
          .map((rule) => rule.rule)
          .filter((ruleName) => !existingRuleNameSet.has(ruleName));

        if (invalidRuleNames.length > 0) {
          throw new Error(`Unknown policy rules: ${invalidRuleNames.join(", ")}`);
        }

        for (const rule of normalizedRules) {
          const typedValues = this.sanitizePropertyRuleValues(
            this.buildTypedRuleValues(ruleDefinitionMap.get(rule.rule), rule.value),
            propertyRuleColumns
          );
          const existingRule = await this.getRuleByPropertyIdAndRule(propertyId, rule.rule);

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

      return await this.getRulesByPropertyId(propertyId);
    });
  }
}
