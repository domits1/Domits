import { TypeException } from "../../util/exception/TypeException.js";

export class PropertyPricing {
    property_id;
    roomRate;
    cleaning;

    constructor(property_id, roomRate, cleaning) {
        this._property_id = property_id;
        this._roomRate = roomRate;
        this._cleaning = cleaning;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new TypeException("propertyPricing - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _roomRate(value) {
        if (typeof value !== "number") {
            throw new TypeException("propertyPricing - Room rate must be a number.")
        }
        if (value < 2) {
            throw new TypeException("propertyPricing - Room rate must be at least €2,-")
        }
        this.roomRate = value;
    }

    set _cleaning(value) {
        if (typeof value === "number") {
            if (value < 0) {
                throw new TypeException("propertyPricing - Cleaning must be at least €0,-")
            }
            this.cleaning = value;
            return;
        } else if (typeof value == "boolean" || typeof value == "string") {
            throw new TypeException("propertyPricing - Cleaning must be a number, null or undefined")
        }
        this.cleaning = 0;
    }
}