import { WishlistService } from "../../functions/Wishlist-Handler/business/service/wishlistService.js";

const mockQuery = jest.fn();
const mockDelete = jest.fn();
const mockPut = jest.fn();

jest.mock("../../functions/Wishlist-Handler/data/wishlistRepository.js", () => ({
  WishlistRepository: jest.fn().mockImplementation(() => ({
    queryByGuestId: mockQuery,
    delete: mockDelete,
    put: mockPut,
  })),
}));

describe("WishlistService - renameWishlist", () => {
  let service;

  beforeEach(() => {
    service = new WishlistService();
    jest.clearAllMocks();
  });

  test("should rename all matching wishlist items", async () => {
    const guestId = "guest123";
    const oldName = "Zomertrip 2025";
    const newName = "Backpacking Azië";

    const items = [
      { guestId, wishlistName: oldName, wishlistKey: "Zomertrip 2025#1", propertyId: "1" },
      { guestId, wishlistName: oldName, wishlistKey: "Zomertrip 2025#2", propertyId: "2" },
    ];

    mockQuery.mockResolvedValue(items);
    mockDelete.mockResolvedValue(true);
    mockPut.mockResolvedValue(true);

    const result = await service.renameWishlist({ guestId, oldName, newName });

    console.log(` Renamed wishlist '${oldName}' → '${newName}' (${result.renamed} items updated)`);

    expect(mockQuery).toHaveBeenCalledWith(guestId);
    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(mockPut).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ renamed: 2 });
  });

  test("should return 0 if no items to rename", async () => {
    mockQuery.mockResolvedValue([]);

    const result = await service.renameWishlist({
      guestId: "guest456",
      oldName: "Winterreis Canada",
      newName: "Winterzon Spanje",
    });


    expect(result).toEqual({ renamed: 0 });
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
  });
});
