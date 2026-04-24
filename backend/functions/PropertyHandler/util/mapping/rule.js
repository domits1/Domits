import { PropertyRule } from "../../business/model/propertyRule.js";

export class RuleMapping {
    static mapDatabaseEntryToRule(ruleEntry) {
        const resolvedValue = RuleMapping.resolveRuleValue(ruleEntry);

        return new PropertyRule(
            ruleEntry.property_id,
            ruleEntry.rule,
            resolvedValue
        )
    }

    static resolveRuleValue(ruleEntry) {
        const normalizedValueType = String(ruleEntry?.value_type || "").trim().toLowerCase();

        if (normalizedValueType === "time" || normalizedValueType === "text") {
            return ruleEntry?.value_new ?? "";
        }

        if (ruleEntry?.value_new !== undefined && ruleEntry?.value_new !== null) {
            return ruleEntry.value_new;
        }

        return ruleEntry?.value === true;
    }
}
