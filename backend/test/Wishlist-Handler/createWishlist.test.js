import { WishlistService } from "../../functions/Wishlist-Handler/business/service/wishlistService.js";
import { DatabaseException } from "../../functions/Wishlist-Handler/util/exception/DatabaseException.js";
import { TypeException } from "../../functions/Wishlist-Handler/util/exception/TypeException.js";


const mockPut = jest.fn();

jest.mock("../../functions/Wishlist-Handler/data/wishlistRepository.js", () => {
  return {
    WishlistRepository: jest.fn().mockImplementation(() => ({
      put: mockPut,
    })),
  };
});

describe("WishlistService - createWishlist", () => {
  let service;

  beforeEach(() => {
    service = new WishlistService(); 
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test(" should create wishlist with placeholder", async () => {
    const guestId = "guest123";
    const wishlistName = "My List";
    const expectedResult = { success: true };

    mockPut.mockResolvedValue(expectedResult);

    const result = await service.createWishlist({ guestId, wishlistName });

    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedResult);
  });

  test(" should throw if wishlistName is missing", async () => {
    await expect(service.createWishlist({ guestId: "guest123" }))
      .rejects
      .toThrow(TypeException);
  });

  test("should throw if put fails", async () => {
    mockPut.mockResolvedValue(null);

    await expect(service.createWishlist({ guestId: "guest123", wishlistName: "My List" }))
      .rejects
      .toThrow(DatabaseException);
  });
});
