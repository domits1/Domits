import { PropertyRule } from "../../business/model/propertyRule.js";

export class RuleMapping {

    static mapDatabaseEntryToRule(ruleEntry) {
        return new PropertyRule(
            ruleEntry.property_id,
            ruleEntry.rule,
            ruleEntry.value
        )
    }
}