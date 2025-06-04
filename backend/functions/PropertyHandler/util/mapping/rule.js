import { PropertyRule } from "../../business/model/propertyRule.js";

export class RuleMapping {

    static mapDatabaseEntryToRule(ruleEntry) {
        return new PropertyRule(
            ruleEntry.property_id.S,
            ruleEntry.rule.S,
            ruleEntry.value.BOOL
        )
    }
}