export class PropertyType {
    property_id;
    property_type;
    spaceType;

    constructor(params) {
        this._property_id = params.property_id;
        this._propertyType = params.property_type;
        this._spaceType = params.spaceType;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new Error("propertyType - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _propertyType(value) {
        if (typeof value !== "string") {
            throw new Error("propertyType - Property type must be a string.")
        }
        this.property_type = value;
    }

    set _spaceType(value) {
        if (typeof value !== "string") {
            throw new Error("propertyType - Space type must be a string.")
        }
        this.spaceType = value;
    }
}