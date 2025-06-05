import { TypeException } from "../../../util/exception/TypeException.js";

export class WishlistItem {
    guestId;
    wishlistKey;
    wishlistName;
    propertyId;

    constructor({ guestId, wishlistKey, wishlistName, propertyId }) {
        this._guestId = guestId;
        this._wishlistKey = wishlistKey;
        this._wishlistName = wishlistName;
        this._propertyId = propertyId;
    }

    set _guestId(value) {
        if (typeof value !== "string") throw new TypeException("guestId must be a string.");
        this.guestId = value;
    }

    set _wishlistKey(value) {
        if (typeof value !== "string") throw new TypeException("wishlistKey must be a string.");
        this.wishlistKey = value;
    }

    set _wishlistName(value) {
        if (typeof value !== "string") throw new TypeException("wishlistName must be a string.");
        this.wishlistName = value;
    }

    set _propertyId(value) {
        if (typeof value !== "string") throw new TypeException("propertyId must be a string.");
        this.propertyId = value;
    }
}
