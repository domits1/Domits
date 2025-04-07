import {assertType} from "./AssertType"

// Accommodation builder model class
export class PropertyModel {
    id;
    hostId;
    title;
    subtitle;
    description;
    guestCapacity;
    registrationNumber;
    status;
    propertyType;
    createdAt;
    updatedAt;

    constructor(params) {
        this._id = params.id;
        this._hostId = params.hostId;
        this._title = params.title;
        this._subtitle = params.subtitle;
        this._description = params.description;
        this._guestCapacity = params.guestCapacity;
        this._registrationNumber = params.registrationNumber;
        this._status = params.status;
        this._propertyType = params.propertyType;
        this._createdAt = params.createdAt;
        this._updatedAt = params.updatedAt;
    }

    set _id(id) {
        assertType(id, "string", "Id");
        this.id = id;
    }

    set _hostId(id) {
        assertType(id, "string", "Host id");
        this.hostId = id;
    }

    set _title(value) {
        assertType(value, "string", "Title");
        this.title = value;
    }

    set _subtitle(value) {
        assertType(value, "string", "Subtitle");
        this.subtitle = value;
    }

    set _description(value) {
        assertType(value, "string", "Description");
        this.description = value;
    }

    set _guestCapacity(value) {
        assertType(value, "number", "Guest capacity");
        this.guestCapacity = value;
    }

    set _registrationNumber(value) {
        assertType(value, "string", "Registration number");
        this.registrationNumber = value;
    }

    set _status(value) {
        assertType(value, "string", "Status");
        this.status = value;
    }

    set _propertyType(value) {
        assertType(value, "string", "Property type");
        this.propertyType = value;
    }

    set _createdAt(value) {
        assertType(value, "number", "Created at");
        this.createdAt = value;
    }

    set _updatedAt(value) {
        assertType(value, "number", "Updated at");
        this.updatedAt = value;
    }
}
