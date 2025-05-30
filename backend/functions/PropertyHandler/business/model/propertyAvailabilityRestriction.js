import { TypeException } from "../../util/exception/TypeException.js";

export class PropertyAvailabilityRestriction {
    id;
    property_id;
    restriction;
    value;

    constructor(id, property_id, restriction, value) {
        this._id = id;
        this._property_id = property_id;
        this._restriction = restriction;
        this._value = value;
    }

    set _id(id) {
        if (typeof id !== "string") {
            throw new TypeException("propertyAvailabilityRestriction - Id must be a string.")
        }
        this.id = id;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new TypeException("propertyAvailabilityRestriction - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _restriction(value) {
        if (typeof value !== "string") {
            throw new TypeException("propertyAvailabilityRestriction - Restriction must be a string.")
        }
        this.restriction = value;
    }

    set _value(value) {
        if (typeof value !== "number") {
            throw new TypeException("propertyAvailabilityRestriction - Restriction value must be a number.")
        }
        this.value = value;
    }
}