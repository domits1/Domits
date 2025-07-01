import { WishlistService } from "../../functions/Wishlist-Handler/business/service/wishlistService.js";
import { DatabaseException } from "../../functions/Wishlist-Handler/util/exception/DatabaseException.js";


const mockPut = jest.fn();
jest.mock("../../functions/Wishlist-Handler/data/wishlistRepository.js", () => {
  return {
    WishlistRepository: jest.fn().mockImplementation(() => ({
      put: mockPut,
    })),
  };
});

describe("WishlistService - addToWishlist", () => {
  let service;

  beforeEach(() => {
    service = new WishlistService(); 
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test(" should add accommodation successfully", async () => {
    const guestId = "guest123";
    const propertyId = "prop001";
    const wishlistName = "Favorites";
    const expectedResult = { success: true };

    mockPut.mockResolvedValue(expectedResult);

    const result = await service.addToWishlist({ guestId, propertyId, wishlistName });

    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });

  test(" should throw if propertyId is missing", async () => {
    await expect(service.addToWishlist({ guestId: "guest123", wishlistName: "Favorites" }))
      .rejects
      .toThrow(DatabaseException);
  });

  test(" should throw if wishlistName is missing", async () => {
    await expect(service.addToWishlist({ guestId: "guest123", propertyId: "prop001" }))
      .rejects
      .toThrow(DatabaseException);
  });

  test(" should throw if put fails", async () => {
    const guestId = "guest123";
    const propertyId = "prop001";
    const wishlistName = "Favorites";

    mockPut.mockResolvedValue(null);

    await expect(service.addToWishlist({ guestId, propertyId, wishlistName }))
      .rejects
      .toThrow(DatabaseException);
  });
});
