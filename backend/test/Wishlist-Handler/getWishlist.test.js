import { WishlistService } from "../../functions/Wishlist-Handler/business/service/wishlistService.js";

const mockQueryByGuestId = jest.fn();

jest.mock("../../functions/Wishlist-Handler/data/wishlistRepository.js", () => {
  return {
    WishlistRepository: jest.fn().mockImplementation(() => ({
      queryByGuestId: mockQueryByGuestId,
    })),
  };
});

describe("WishlistService - getWishlist", () => {
  let service;

  beforeEach(() => {
    service = new WishlistService(); 
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test(" should return filtered wishlist items", async () => {
    const guestId = "guest123";
    const wishlistName = "Favorites";

    const mockData = [
      { wishlistName: "Favorites", propertyId: "1" },
      { wishlistName: "Work trip", propertyId: "2" },
      { wishlistName: "Favorites", propertyId: "3" },
    ];

    mockQueryByGuestId.mockResolvedValue(mockData);

    const result = await service.getWishlist({ guestId, wishlistName });

    expect(result).toEqual([
      { wishlistName: "Favorites", propertyId: "1" },
      { wishlistName: "Favorites", propertyId: "3" },
    ]);
    expect(mockQueryByGuestId).toHaveBeenCalledWith(guestId);
  });

  test(" should return empty array if no matches found", async () => {
    const guestId = "guest123";
    const wishlistName = "Nonexistent";

    const mockData = [
      { wishlistName: "Favorites", propertyId: "1" },
    ];

    mockQueryByGuestId.mockResolvedValue(mockData);

    const result = await service.getWishlist({ guestId, wishlistName });

    expect(result).toEqual([]);
  });
});
