export class PropertyImage {
    property_id;
    key;
    image;

    constructor(property_id, key, image) {
        this._property_id = property_id;
        this._key = key;
        this._image = image;
    }

    set _property_id(id) {
        if (typeof id !== "string") {
            throw new Error("propertyImage - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _key(value) {
        if (typeof value !== "string") {
            throw new Error("propertyImage - Key must be a string.")
        }
        this.key = value;
    }

    set _image(value) {
        console.log(value)
        if (!value.startsWith("data:image/")) {
            throw new Error("Image must be an image.")
        }
        this.image = value;
    }
}