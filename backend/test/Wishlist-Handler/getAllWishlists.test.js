import { WishlistService } from "../../functions/Wishlist-Handler/business/service/wishlistService.js";

const mockQueryByGuestId = jest.fn();
jest.mock("../../functions/Wishlist-Handler/data/wishlistRepository.js", () => ({
  WishlistRepository: jest.fn().mockImplementation(() => ({
    queryByGuestId: mockQueryByGuestId,
  })),
}));

describe("WishlistService - getAllWishlists", () => {
  let service;

  beforeEach(() => {
    service = new WishlistService();
  });

  test("should return grouped wishlists by name", async () => {
    const mockItems = [
      { wishlistName: "Favorites", propertyId: "p1" },
      { wishlistName: "Favorites", propertyId: "p2" },
      { wishlistName: "Italy", propertyId: "p3" },
    ];
    mockQueryByGuestId.mockResolvedValue(mockItems);

    const result = await service.getAllWishlists("guest123");

    expect(result).toEqual({
      Favorites: ["p1", "p2"],
      Italy: ["p3"],
    });
  });
});
