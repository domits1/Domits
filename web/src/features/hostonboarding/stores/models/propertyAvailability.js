export class PropertyAvailability {
    property_id;
    availableStartDate;
    availableEndDate;

    constructor(property_id, availableStartDate, availableEndDate) {
        this._property_id = property_id;
        this._availableStartDate = availableStartDate;
        this._availableEndDate = availableEndDate;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new Error("propertyAvailability - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _availableStartDate(value) {
        if (typeof value !== "number") {
            throw new Error("propertyAvailability - Available start date must be a number.")
        }
        this.availableStartDate = value
    }

    set _availableEndDate(value) {
        if (typeof value !== "number") {
            throw new Error("propertyAvailability - Available end date must be a number.")
        }
        this.availableEndDate = value
    }

}