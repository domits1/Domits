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
        if (typeof id !== "string") {
            throw new Error("propertyModel - Id must be a string.")
        }
        this.id = id;
    }

    set _hostId(id) {
        if (typeof id !== "string") {
            throw new Error("propertyModel - Host id must be a string.")
        }
        this.hostId = id;
    }

    set _title(value) {
        if (typeof value !== "string") {
            throw new Error("propertyModel - Title must be a string.")
        }
        this.title = value;
    }

    set _subtitle(value) {
        if (typeof value !== "string") {
            throw new Error("propertyModel - Subtitle must be a string.")
        }
        this.subtitle = value;
    }

    set _description(value) {
        if (typeof value !== "string") {
            throw new Error("propertyModel - Description must be a string.")
        }
        this.description = value;
    }

    set _guestCapacity(value) {
        if (typeof value !== "number") {
            throw new Error("propertyModel - Guest capacity must be a number.")
        }
        this.guestCapacity = value;
    }

    set _registrationNumber(value) {
        if (typeof value !== "string") {
            throw new Error("propertyModel - Registration number must be a string.")
        }
        this.registrationNumber = value;
    }

    set _status(value) {
        if (typeof value !== "string") {
            throw new Error("propertyModel - Status must be a string.")
        }
        this.status = value;
    }

    set _propertyType(value) {
        if (typeof value !== "string") {
            throw new Error("propertyModel - Property type must be a string.")
        }
        this.propertyType = value;
    }

    set _createdAt(value) {
        if (typeof value !== "number") {
            throw new Error("propertyModel - Created at must be a number.")
        }
        this.createdAt = value;
    }

    set _updatedAt(value) {
        if (typeof value !== "number") {
            throw new Error("propertyModel - Updated at must be a number.")
        }
        this.updatedAt = value;
    }
}