import { WishlistService } from "../../functions/Wishlist-Handler/business/service/wishlistService.js";

const mockQuery = jest.fn();
const mockDelete = jest.fn();

jest.mock("../../functions/Wishlist-Handler/data/wishlistRepository.js", () => ({
  WishlistRepository: jest.fn().mockImplementation(() => ({
    queryByGuestId: mockQuery,
    delete: mockDelete,
  })),
}));

describe("WishlistService - delete all wishlists", () => {
  let service;

  beforeEach(() => {
    service = new WishlistService();
    mockDelete.mockClear();
  });

  test("should delete all wishlist items and log list names", async () => {
    const guestId = "guest789";

    const items = [
      { guestId, wishlistName: "Frankrijk", wishlistKey: "Frankrijk#1" },
      { guestId, wishlistName: "Marokko", wishlistKey: "Marokko#1" },
      { guestId, wishlistName: "Japan", wishlistKey: "Japan#1" },
    ];

    mockQuery.mockResolvedValue(items);
    mockDelete.mockResolvedValue(true);

   
    const uniqueListNames = [...new Set(items.map((item) => item.wishlistName))];

    const deletedLists = [];

    for (const name of uniqueListNames) {
      const result = await service.deleteEntireWishlist({ guestId, wishlistName: name });
      if (result.deletedCount > 0) {
        deletedLists.push(name);
      }
    }

    expect(mockDelete).toHaveBeenCalledTimes(3);
    expect(deletedLists).toEqual(["Frankrijk", "Marokko", "Japan"]);

    
    console.log(" Deleted wishlists:", deletedLists.join(", "));
  });
});
