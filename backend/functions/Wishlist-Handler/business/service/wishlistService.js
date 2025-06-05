import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { WishlistRepository } from "../../data/wishlistRepository.js";
import { WishlistItem } from "../model/wishlistModel.js";
import { randomUUID } from "crypto";

import { DatabaseException } from "../../../util/exception/DatabaseException.js";
import { NotFoundException } from "../../../util/exception/NotFoundException.js";
import { TypeException } from "../../../util/exception/TypeException.js";

export class WishlistService {
  constructor(dynamoDbClient = new DynamoDBClient({})) {
    this.wishlistRepository = new WishlistRepository(dynamoDbClient);
  }

  async createWishlist({ guestId, wishlistName }) {
    const wishlistKey = randomUUID();
    const item = new WishlistItem({
      guestId,
      wishlistKey,
      wishlistName,
      propertyId: "__placeholder__" // leeg item om wishlist aan te maken
    });
    const result = await this.wishlistRepository.create(item);
    if (!result) {
      throw new DatabaseException("Failed to create wishlist.");
    }
    return wishlistKey;
  }

  async addPropertyToWishlist({ guestId, wishlistKey, propertyId }) {
    const item = new WishlistItem({
      guestId,
      wishlistKey,
      propertyId,
      wishlistName: "__ignored__" // bij toevoegen niet nodig
    });
    const result = await this.wishlistRepository.create(item);
    if (!result) {
      throw new DatabaseException("Failed to add property to wishlist.");
    }
    return result;
  }

  async removePropertyFromWishlist({ guestId, wishlistKey, propertyId }) {
    const result = await this.wishlistRepository.delete({ guestId, wishlistKey, propertyId });
    if (!result) {
      throw new NotFoundException("Wishlist item not found.");
    }
    return result;
  }

  async deleteWishlist({ guestId, wishlistKey }) {
    const result = await this.wishlistRepository.deleteAll({ guestId, wishlistKey });
    if (!result) {
      throw new DatabaseException("Failed to delete wishlist.");
    }
    return result;
  }

  async getWishlist({ guestId, wishlistKey }) {
    const items = await this.wishlistRepository.getByKey({ guestId, wishlistKey });
    if (!items || items.length === 0) {
      throw new NotFoundException("Wishlist not found.");
    }
    return items;
  }

  async getAllWishlists(guestId) {
    const items = await this.wishlistRepository.getAll(guestId);
    return items.reduce((acc, item) => {
      if (!acc[item.wishlistKey]) {
        acc[item.wishlistKey] = [];
      }
      acc[item.wishlistKey].push(item);
      return acc;
    }, {});
  }

  async renameWishlist({ guestId, wishlistKey, newName }) {
    const updated = await this.wishlistRepository.rename({ guestId, wishlistKey, newName });
    if (!updated) {
      throw new DatabaseException("Failed to rename wishlist.");
    }
    return updated;
  }
}
