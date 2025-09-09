import { WishlistService } from "../../functions/Wishlist-Handler/business/service/wishlistService.js";

const mockQuery = jest.fn();
const mockDelete = jest.fn();

jest.mock("../../functions/Wishlist-Handler/data/wishlistRepository.js", () => ({
  WishlistRepository: jest.fn().mockImplementation(() => ({
    queryByGuestId: mockQuery,
    delete: mockDelete,
  })),
}));

describe("WishlistService - deleteEntireWishlist", () => {
  let service;

  beforeEach(() => {
    service = new WishlistService();
    mockDelete.mockClear();
  });

  test("should delete item from 'Zweden' wishlist", async () => {
    const items = [
      { guestId: "guest123", wishlistName: "Zweden", wishlistKey: "Zweden#1" },
      { guestId: "guest123", wishlistName: "België", wishlistKey: "België#1" },
      { guestId: "guest123", wishlistName: "Senegal", wishlistKey: "Senegal#1" },
    ];

    mockQuery.mockResolvedValue(items);
    mockDelete.mockResolvedValue(true);

    const result = await service.deleteEntireWishlist({
      guestId: "guest123",
      wishlistName: "Zweden",
    });

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith({ guestId: "guest123", wishlistKey: "Zweden#1" });
    expect(result).toEqual({ deletedCount: 1 });
  });
});
