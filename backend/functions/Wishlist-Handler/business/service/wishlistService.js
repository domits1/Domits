import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { WishlistRepository } from "../../data/wishlistRepository.js";
import { WishlistItem } from "../model/wishlistModel.js";
import { DatabaseException } from "../../util/exception/DatabaseException.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";

export class WishlistService {
  constructor(dynamoDbClient = new DynamoDBClient({})) {
    this.wishlistRepository = new WishlistRepository(dynamoDbClient);
  }

  async createWishlist({ guestId, wishlistName }) {
    if (!wishlistName) throw new DatabaseException("wishlistName is required");

    const wishlistKey = `${wishlistName}#__placeholder__`;

    const item = new WishlistItem({
      guestId,
      wishlistKey,
      wishlistName,
      isPlaceholder: true,
    });

    const result = await this.wishlistRepository.put(item);
    if (!result) throw new DatabaseException("Failed to create wishlist.");

    return result;
  }

  async addToWishlist({ guestId, propertyId, wishlistName }) {
    if (!propertyId || !wishlistName) throw new DatabaseException("propertyId and wishlistName are required");

    const wishlistKey = `${wishlistName}#${propertyId}`;

    const item = new WishlistItem({
      guestId,
      wishlistKey,
      wishlistName,
      propertyId,
    });

    const result = await this.wishlistRepository.put(item);
    if (!result) throw new DatabaseException("Failed to add accommodation.");

    return result;
  }

  async removeFromWishlist({ guestId, propertyId, wishlistName }) {
    const wishlistKey = `${wishlistName}#${propertyId}`;
    const result = await this.wishlistRepository.delete({ guestId, wishlistKey });

    if (!result) throw new NotFoundException("Accommodation not found in wishlist.");

    return result;
  }

  async deleteEntireWishlist({ guestId, wishlistName }) {
    const items = await this.wishlistRepository.queryByGuestId(guestId);
    const toDelete = items.filter((item) => item.wishlistName === wishlistName);

    for (const item of toDelete) {
      await this.wishlistRepository.delete({ guestId: item.guestId, wishlistKey: item.wishlistKey });
    }

    return { deletedCount: toDelete.length };
  }

  async getWishlist({ guestId, wishlistName }) {
    const items = await this.wishlistRepository.queryByGuestId(guestId);
    const filtered = items.filter((item) => item.wishlistName === wishlistName);
    return filtered;
  }

  async getAllWishlists(guestId) {
    const items = await this.wishlistRepository.queryByGuestId(guestId);

    return items.reduce((acc, item) => {
      const name = item.wishlistName || "My next trip";
      if (!acc[name]) acc[name] = [];
      acc[name].push(item.propertyId);
      return acc;
    }, {});
  }

  async renameWishlist({ guestId, oldName, newName }) {
    const items = await this.wishlistRepository.queryByGuestId(guestId);
    const toUpdate = items.filter((item) => item.wishlistName === oldName);

    for (const item of toUpdate) {
      const oldKey = item.wishlistKey;
      const newKey = `${newName}#${item.propertyId}`;

      await this.wishlistRepository.delete({ guestId: item.guestId, wishlistKey: oldKey });

      await this.wishlistRepository.put({
        guestId: item.guestId,
        wishlistKey: newKey,
        wishlistName: newName,
        propertyId: item.propertyId,
      });
    }

    return { renamed: toUpdate.length };
  }

  async moveAccommodation({ guestId, oldName, newName, propertyId }) {
    const oldKey = `${oldName}#${propertyId}`;
    const newKey = `${newName}#${propertyId}`;

    await this.wishlistRepository.delete({ guestId, wishlistKey: oldKey });

    const result = await this.wishlistRepository.put({
      guestId,
      wishlistKey: newKey,
      wishlistName: newName,
      propertyId,
    });

    if (!result) throw new DatabaseException("Failed to move accommodation.");

    return result;
  }
}
