import { RuleMapping } from "../../util/mapping/rule.js";
import Database from "database";
import {Rules} from "database/models/Rules";
import {Property_Rule} from "database/models/Property_Rule";

export class PropertyRuleRepository {

    constructor(dynamoDbClient, systemManager) {
        this.systemManager = systemManager
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
        return result.length > 0 ? result.map(item => RuleMapping.mapDatabaseEntryToRule(item)) : null;
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
        await client
            .createQueryBuilder()
            .insert()
            .into(Property_Rule)
            .values({
                property_id: rule.property_id,
                rule: rule.rule,
                value: rule.value
            })
            .execute();
        const result = await this.getRuleByPropertyIdAndRule(rule.property_id, rule.rule);
        return result ? result : null;
    }

}