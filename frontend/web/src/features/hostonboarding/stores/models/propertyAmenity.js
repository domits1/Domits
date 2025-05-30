export class PropertyAmenity {
    id;
    property_id;
    amenityId;

    constructor(id, property_id, amenityId) {
        this._id = id;
        this._property_id = property_id;
        this._amenityId = amenityId;
    }

    set _id(id) {
        if (typeof id !== "string") {
            throw new Error("propertyAmenity - Id must be a string.")
        }
        this.id = id;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new Error("propertyAmenity - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _amenityId(id) {
        if (typeof id !== "string") {
            throw new Error("propertyAmenity - Amenity id must be a string.")
        }
        this.amenityId = id;
    }
}