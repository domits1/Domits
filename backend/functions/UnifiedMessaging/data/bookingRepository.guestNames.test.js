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

  test("queries in chunks of 100, keeps the host filter on every chunk and merges the results", async () => {
    const bookingIds = Array.from({ length: 250 }, (_, i) => `booking-${i}`);
    queryBuilder.getMany
      .mockResolvedValueOnce([{ id: "booking-0", guestname: "First Guest" }])
      .mockResolvedValueOnce([{ id: "booking-150", guestname: "Second Guest" }])
      .mockResolvedValueOnce([{ id: "booking-249", guestname: "Third Guest" }]);

    const names = await new BookingRepository().findGuestNamesForHostBookings({ hostId: "host-1", bookingIds });

    expect(queryBuilder.where.mock.calls.map(([, params]) => params.bookingIds.length)).toEqual([100, 100, 50]);
    expect(queryBuilder.where.mock.calls.flatMap(([, params]) => params.bookingIds)).toEqual(bookingIds);
    expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
    for (const call of queryBuilder.andWhere.mock.calls) {
      expect(call).toEqual(["booking.hostid = :hostId", { hostId: "host-1" }]);
    }
    expect(names).toEqual({
      "booking-0": "First Guest",
      "booking-150": "Second Guest",
      "booking-249": "Third Guest",
    });
  });

  test("queries a duplicated booking id only once", async () => {
    queryBuilder.getMany.mockResolvedValue([{ id: "booking-1", guestname: "Tst Domits" }]);

    await new BookingRepository().findGuestNamesForHostBookings({
      hostId: "host-1",
      bookingIds: ["booking-1", "booking-2", "booking-1"],
    });

    expect(queryBuilder.where).toHaveBeenCalledTimes(1);
    expect(queryBuilder.where).toHaveBeenCalledWith("booking.id IN (:...bookingIds)", {
      bookingIds: ["booking-1", "booking-2"],
    });
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
