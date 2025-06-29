import { TypeException } from "../../util/exception/TypeException.js";

export class PropertyBaseDetails {
    id;
    hostId;
    title;
    subtitle;
    description;
    registrationNumber;
    status;
    createdAt;
    updatedAt;

    constructor(params) {
        this._id = params.id;
        this._hostId = params.hostId;
        this._title = params.title;
        this._subtitle = params.subtitle;
        this._description = params.description;
        this._registrationNumber = params.registrationNumber;
        this._status = params.status;
        this._createdAt = params.createdAt;
        this._updatedAt = params.updatedAt;
    }

    set _id(id) {
        if (typeof id !== "string") {
            throw new TypeException("propertyModel - Id must be a string.")
        }
        this.id = id;
    }

    set _hostId(id) {
        if (typeof id !== "string") {
            throw new TypeException("propertyModel - Host id must be a string.")
        }
        this.hostId = id;
    }

    set _title(value) {
        if (typeof value !== "string") {
            throw new TypeException("propertyModel - Title must be a string.")
        }
        this.title = value;
    }

    set _subtitle(value) {
        if (typeof value !== "string") {
            throw new TypeException("propertyModel - Subtitle must be a string.")
        }
        this.subtitle = value;
    }

    set _description(value) {
        if (typeof value !== "string") {
            throw new TypeException("propertyModel - Description must be a string.")
        }
        this.description = value;
    }

    set _registrationNumber(value) {
        if (typeof value !== "string") {
            throw new TypeException("propertyModel - Registration number must be a string.")
        }
        this.registrationNumber = value;
    }

    set _status(value) {
        if (typeof value !== "string") {
            throw new TypeException("propertyModel - Status must be a string.")
        }
        this.status = value;
    }

    set _createdAt(value) {
        if (typeof value !== "number") {
            throw new TypeException("propertyModel - Created at must be a number.")
        }
        this.createdAt = value;
    }

    set _updatedAt(value) {
        if (typeof value !== "number") {
            throw new TypeException("propertyModel - Updated at must be a number.")
        }
        this.updatedAt = value;
    }
}