export class PropertyRule {
    property_id;
    rule;
    value;

    constructor(property_id, rule, value) {
        this._property_id = property_id;
        this._rule = rule;
        this._value = value;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new Error("propertyRule - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _rule(value) {
        if (typeof value !== "string") {
            throw new Error("propertyRule - Rule must be a string.")
        }
        this.rule = value;
    }

    set _value(value) {
        if (typeof value !== "boolean") {
            throw new Error("propertyRule - Value must be a boolean.")
        }
        this.value = value;
    }
}