jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const BookingRepository = require("./bookingRepository.js").default;

describe("BookingRepository.findGuestNamesForHostBookings", () => {
  let queryBuilder;

  beforeEach(() => {
    jest.clearAllMocks();
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    Database.getInstance.mockResolvedValue({
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => queryBuilder) })),
    });
  });

  test("returns guest names by booking id, only for bookings of that host", async () => {
    queryBuilder.getMany.mockResolvedValue([
      { id: "booking-1", guestname: "Tst Domits" },
      { id: "booking-2", guestname: null },
    ]);

    const names = await new BookingRepository().findGuestNamesForHostBookings({
      hostId: "host-1",
      bookingIds: ["booking-1", "booking-2"],
    });

    expect(names).toEqual({ "booking-1": "Tst Domits" });
    expect(queryBuilder.where).toHaveBeenCalledWith("booking.id IN (:...bookingIds)", {
      bookingIds: ["booking-1", "booking-2"],
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith("booking.hostid = :hostId", { hostId: "host-1" });
  });

  test.each([
    ["no host", { hostId: null, bookingIds: ["booking-1"] }],
    ["no booking ids", { hostId: "host-1", bookingIds: [] }],
  ])("returns no names and skips the query with %s", async (_label, input) => {
    const names = await new BookingRepository().findGuestNamesForHostBookings(input);

    expect(names).toEqual({});
    expect(Database.getInstance).not.toHaveBeenCalled();
  });
});
