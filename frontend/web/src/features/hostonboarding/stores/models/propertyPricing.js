export class PropertyPricing {
    property_id;
    roomRate;
    cleaning;
    service;

    constructor(property_id, roomRate, cleaning, service) {
        this._property_id = property_id;
        this._roomRate = roomRate;
        this._cleaning = cleaning;
        this._service = service;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new Error("propertyPricing - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _roomRate(value) {
        if (typeof value !== "number") {
            throw new Error("propertyPricing - Room rate must be a number.")
        }
        this.roomRate = value;
    }

    set _cleaning(value) {
        if (typeof value !== "number") {
            throw new Error("propertyPricing - Cleaning must be a number.")
        }
        this.cleaning = value;
    }

    set _service(value) {
        if (typeof value !== "number") {
            throw new Error("propertyPricing - Service must be a number.")
        }
        this.service = value;
    }
}