export class PropertyImage {
    property_id;
    key;

    constructor(property_id, key) {
        this._property_id = property_id;
        this._key = key;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new Error("propertyImage - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _key(value) {
        if (typeof value !== "string") {
            throw new Error("propertyImage - Key must be a string.")
        }
        this.key = value;
    }
}