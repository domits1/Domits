import { TypeException } from "../../util/exception/TypeException.js";

export class PropertyLocation {
    property_id;
    country;
    city;
    street;
    houseNumber;
    houseNumberExtension;
    postalCode;

    constructor(property_id, country, city, street, houseNumber, houseNumberExtension, postalCode) {
        this._property_id = property_id;
        this._country = country;
        this._city = city;
        this._street = street;
        this._houseNumber = houseNumber;
        this._houseNumberExtension = houseNumberExtension;
        this._postalCode = postalCode;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new TypeException("propertyLocation - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _country(value) {
        if (typeof value !== "string") {
            throw new TypeError("propertyLocation - Country must be a string.");
        }

        if (value.split(" ").length > 1) {
            const words = value.trim().split(" ");
            const capitalizedWords = words.map(
                word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            );
            this.country = capitalizedWords.join(" ");
        } else {
            this.country = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        }

    }

    set _city(value) {
        if (typeof value !== "string") {
            throw new TypeException("propertyLocation - City must be a string.")
        }
        this.city = value;
    }

    set _street(value) {
        if (typeof value !== "string") {
            throw new TypeException("propertyLocation - Street must be a string.")
        }
        this.street = value;
    }

    set _houseNumber(value) {
        if (typeof value !== "number") {
            throw new TypeException("propertyLocation - House number must be a number.")
        }
        this.houseNumber = value;
    }

    set _houseNumberExtension(value) {
        if (typeof value !== "string") {
            this.houseNumberExtension = "";
        } else {
            this.houseNumberExtension = value;
        }
    }

    set _postalCode(value) {
        if (typeof value !== "string") {
            throw new TypeException("propertyLocation - Postal code must be a string.")
        }
        this.postalCode = value;
    }
}