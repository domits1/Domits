import { WishlistService } from "../../functions/Wishlist-Handler/business/service/wishlistService.js";
import { NotFoundException } from "../../functions/Wishlist-Handler/util/exception/NotFoundException.js";

const mockDelete = jest.fn();
jest.mock("../../functions/Wishlist-Handler/data/wishlistRepository.js", () => ({
  WishlistRepository: jest.fn().mockImplementation(() => ({
    delete: mockDelete,
  })),
}));

describe("WishlistService - removeFromWishlist", () => {
  let service;

  beforeEach(() => {
    service = new WishlistService();
  });

  test("should remove item successfully", async () => {
    mockDelete.mockResolvedValue(true);

    const result = await service.removeFromWishlist({
      guestId: "guest123",
      propertyId: "p1",
      wishlistName: "Favorites",
    });

    expect(result).toBe(true);
  });

  test("should throw NotFoundException if item not found", async () => {
    mockDelete.mockResolvedValue(null);

    await expect(
      service.removeFromWishlist({
        guestId: "guest123",
        propertyId: "p1",
        wishlistName: "Favorites",
      })
    ).rejects.toThrow(NotFoundException);
  });
});
