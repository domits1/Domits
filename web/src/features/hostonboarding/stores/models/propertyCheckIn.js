export class PropertyCheckIn {
    property_id;
    checkIn;
    checkOut;

    constructor(property_id, checkIn, checkOut) {
        this._property_id = property_id;
        this._checkIn = checkIn;
        this._checkOut = checkOut;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new Error("propertyCheckIn - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _checkIn(value) {
        if (typeof value !== "object") {
            throw new Error("propertyCheckIn - Check in must be an object.")
        }
        if (typeof value.from !== "number") {
            throw new Error("propertyCheckIn - Check in 'from' must be a number.")
        }
        if (typeof value.till !== "number") {
            throw new Error("propertyCheckIn - Check in 'till' must be a number.")
        }
        this.checkIn = value;
    }

    set _checkOut(value) {
        if (typeof value !== "object") {
            throw new Error("propertyCheckIn - Check out must be an object.")
        }
        if (typeof value.from !== "number") {
            throw new Error("propertyCheckIn - Check out 'from' must be a number.")
        }
        if (typeof value.till !== "number") {
            throw new Error("propertyCheckIn - Check out 'till' must be a number.")
        }
        this.checkOut = value;
    }
}