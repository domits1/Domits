import { WishlistItem } from "../model/wishlistModel.js";
import { NotFoundException } from "../../../util/exception/NotFoundException.js";
import { TypeException } from "../../../util/exception/TypeException.js";
import { randomUUID } from "crypto";

export class WishlistBuilder {
    wishlistItem;

    constructor() {
        this.wishlistItem = {};
    }

    setGuestId(guestId) {
        if (typeof guestId !== "string") {
            throw new TypeException("guestId must be a string.");
        }
        this.wishlistItem.guestId = guestId;
        return this;
    }

    setWishlistKey(key = null) {
        this.wishlistItem.wishlistKey = key || randomUUID();
        return this;
    }

    setWishlistName(name) {
        if (typeof name !== "string") {
            throw new TypeException("wishlistName must be a string.");
        }
        this.wishlistItem.wishlistName = name;
        return this;
    }

    setPropertyId(propertyId) {
        if (typeof propertyId !== "string") {
            throw new TypeException("propertyId must be a string.");
        }
        this.wishlistItem.propertyId = propertyId;
        return this;
    }

    build() {
        // Controle: zijn alle verplichte velden aanwezig?
        const requiredFields = ["guestId", "wishlistKey", "wishlistName", "propertyId"];
        for (const field of requiredFields) {
            if (!this.wishlistItem[field]) {
                throw new NotFoundException(`Missing required field: ${field}`);
            }
        }

        return new WishlistItem(this.wishlistItem);
    }
}
