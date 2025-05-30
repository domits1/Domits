export class PropertyGeneralDetail {
    id;
    property_id;
    detail;
    value;

    constructor(id, property_id, detail, value) {
        this._id = id;
        this._property_id = property_id;
        this._detail = detail;
        this._value = value;
    }

    set _id(id) {
        if (typeof id !== "string") {
            throw new Error("propertyGeneralDetail - Id must be a string.")
        }
        this.id = id;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new Error("propertyGeneralDetail - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _detail(value) {
        if (typeof value !== "string") {
            throw new Error("propertyGeneralDetail - Detail must be a string.")
        }
        this.detail = value;
    }

    set _value(value) {
        if (typeof value !== "number") {
            throw new Error("propertyGeneralDetail - Value must be a number.")
        }
        this.value = value;
    }
}