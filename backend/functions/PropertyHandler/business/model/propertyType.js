import { TypeException } from "../../util/exception/TypeException.js";

export class PropertyType {
    property_id;
    property_type;
    spaceType;

    constructor(params = {}) {
    if (typeof params !== "object") {
        throw new TypeException("propertyType - Params must be an object.");
    }
    if (!params.property_type) {
        throw new TypeException("propertyType - Missing property_type.");
    }

    this._property_id = params.property_id;
    this._propertyType = params.property_type;
    this._spaceType = params.spaceType;
}
    set _property_id(id) {
        if (typeof id !== "string") {
            throw new TypeException("propertyType - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _propertyType(value) {
        if (typeof value !== "string") {
            throw new TypeException("propertyType - Property type must be a string.")
        }
        this.property_type = value;
    }

    set _spaceType(value) {
        if (typeof value !== "string") {
            throw new TypeException("propertyType - Space type must be a string.")
        }
        this.spaceType = value;
    }
}