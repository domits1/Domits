import { WishlistService } from "../../functions/Wishlist-Handler/business/service/wishlistService.js";
import { DatabaseException } from "../../functions/Wishlist-Handler/util/exception/DatabaseException.js";

const mockDelete = jest.fn();
const mockPut = jest.fn();

jest.mock("../../functions/Wishlist-Handler/data/wishlistRepository.js", () => ({
  WishlistRepository: jest.fn().mockImplementation(() => ({
    delete: mockDelete,
    put: mockPut,
  })),
}));

describe("WishlistService - moveAccommodation", () => {
  let service;

  beforeEach(() => {
    service = new WishlistService();
    jest.clearAllMocks();
  });

  test("should move accommodation successfully", async () => {
    mockDelete.mockResolvedValue(true);
    mockPut.mockResolvedValue({ success: true });

    const result = await service.moveAccommodation({
      guestId: "guest123",
      oldName: "Weekendje Amsterdam",
      newName: "Roadtrip Italië",
      propertyId: "villa88",
    });

    console.log("Accommodation 'villa88' moved from 'Weekendje Amsterdam' to 'Roadtrip Italië'");

    expect(result).toEqual({ success: true });
    expect(mockDelete).toHaveBeenCalled();
    expect(mockPut).toHaveBeenCalled();
  });

  test("should throw if put fails", async () => {
    mockDelete.mockResolvedValue(true);
    mockPut.mockResolvedValue(null);

    await expect(
      service.moveAccommodation({
        guestId: "guest123",
        oldName: "Weekendje Amsterdam",
        newName: "Roadtrip Italië",
        propertyId: "villa88",
      })
    ).rejects.toThrow(DatabaseException);
  });
});
