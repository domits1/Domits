import { TypeException } from "../../util/exception/TypeException.js";

const isValidTimeString = (value) => {
    return typeof value === "string" && /^([0-9]|[01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(value);
};

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
            throw new TypeException("propertyCheckIn - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _checkIn(value) {
        if (typeof value !== "object") {
            throw new TypeException("propertyCheckIn - Check in must be an object.")
        }
        if (!isValidTimeString(value.from)) {
            throw new TypeException("propertyCheckIn - Check in 'from' must be a valid time string (HH:MM).")
        }
        if (!isValidTimeString(value.till)) {
            throw new TypeException("propertyCheckIn - Check in 'till' must be a valid time string (HH:MM).")
        }
        this.checkIn = value;
    }

    set _checkOut(value) {
        if (typeof value !== "object") {
            throw new TypeException("propertyCheckIn - Check out must be an object.")
        }
        if (!isValidTimeString(value.from)) {
            throw new TypeException("propertyCheckIn - Check out 'from' must be a valid time string (HH:MM).")
        }
        if (!isValidTimeString(value.till)) {
            throw new TypeException("propertyCheckIn - Check out 'till' must be a valid time string (HH:MM).")
        }
        this.checkOut = value;
    }
}