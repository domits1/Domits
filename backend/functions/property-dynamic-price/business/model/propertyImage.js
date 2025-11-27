import { TypeException } from "../../util/exception/TypeException.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";

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
            throw new TypeException("propertyImage - Property id must be a string.")
        }
        this.property_id = id;
    }

    set _key(value) {
        if (typeof value !== "string") {
            throw new TypeException("propertyImage - Key must be a string.")
        }
        this.key = value;
    }

    set _image(value) {
        if (!value) {
            throw new NotFoundException("propertyImage - Image not found.")
        }
        const dataStructures = value.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!dataStructures) {
            throw new Error("Invalid image data URL");
        }
        const imageData = value.split(",")[1];
        const padding = (imageData.match(/=+$/) || [''])[0].length;
        const imageDataBytes = (imageData.length * 3/4) - padding;
        const imageDataKiloBytes = imageDataBytes / 1024;
        if (imageDataKiloBytes > 500) {
            throw new Error(`Images must be less than 500KB: ${value}`)
        } else if (imageDataKiloBytes < 50) {
            throw new Error(`Images must be at least 50KB: ${value}`)
        }
        this.image = value;
    }
}