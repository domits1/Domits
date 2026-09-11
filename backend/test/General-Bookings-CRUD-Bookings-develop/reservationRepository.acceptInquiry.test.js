jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("database").default;
const ReservationRepository =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js").default;

const createBuilder = (result) => {
  const builder = {};
  ["update", "set", "where", "andWhere", "getMany", "getRepository", "createQueryBuilder"].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.execute = jest.fn(async () => result);
  return builder;
};

const OVERLAP_ARGS = {
  bookingId: "booking-1",
  propertyId: "property-1",
  arrivalDateMs: 1000,
  departureDateMs: 2000,
};

describe("ReservationRepository accept-inquiry transaction", () => {
  test("transitions the booking and declines every overlapping inquiry in one transaction", async () => {
    const statusUpdate = createBuilder({ affected: 1 });
    const overlapSelect = createBuilder(null);
    overlapSelect.getMany = jest.fn(async () => [{ id: "overlap-1" }, { id: "overlap-2" }]);
    const declineOverlap1 = createBuilder({ affected: 1 });
    const declineOverlap2 = createBuilder({ affected: 1 });

    const manager = {
      createQueryBuilder: jest.fn().mockReturnValueOnce(statusUpdate).mockReturnValueOnce(declineOverlap1).mockReturnValueOnce(declineOverlap2),
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => overlapSelect) })),
    };
    const transaction = jest.fn(async (callback) => callback(manager));
    Database.getInstance.mockResolvedValue({ transaction });
    const repository = new ReservationRepository();

    const result = await repository.acceptInquiryWithOverlapDecline(OVERLAP_ARGS);

    expect(result).toEqual({ accepted: true, declinedCount: 2 });
    expect(statusUpdate.where).toHaveBeenCalledWith("id = :id", { id: "booking-1" });
    expect(statusUpdate.andWhere).toHaveBeenCalledWith("status = :inquiryStatus", { inquiryStatus: "Inquiry" });
    expect(statusUpdate.set).toHaveBeenCalledWith({ status: "Awaiting Payment" });
    expect(declineOverlap1.set).toHaveBeenCalledWith({ status: "Declined" });
    expect(declineOverlap1.where).toHaveBeenCalledWith("id = :id", { id: "overlap-1" });
    expect(declineOverlap2.where).toHaveBeenCalledWith("id = :id", { id: "overlap-2" });
  });

  test("returns accepted:false without touching overlaps when the booking is no longer Inquiry", async () => {
    const statusUpdate = createBuilder({ affected: 0 });
    const overlapCreateQueryBuilder = jest.fn();
    const manager = {
      createQueryBuilder: jest.fn().mockReturnValue(statusUpdate),
      getRepository: jest.fn(() => ({ createQueryBuilder: overlapCreateQueryBuilder })),
    };
    const transaction = jest.fn(async (callback) => callback(manager));
    Database.getInstance.mockResolvedValue({ transaction });
    const repository = new ReservationRepository();

    const result = await repository.acceptInquiryWithOverlapDecline(OVERLAP_ARGS);

    expect(result).toEqual({ accepted: false, declinedCount: 0 });
    expect(overlapCreateQueryBuilder).not.toHaveBeenCalled();
  });

  test("propagates a failure from declining an overlap so the transaction rolls back the status change too", async () => {
    const statusUpdate = createBuilder({ affected: 1 });
    const overlapSelect = createBuilder(null);
    overlapSelect.getMany = jest.fn(async () => [{ id: "overlap-1" }]);
    const declineOverlap1 = createBuilder(null);
    declineOverlap1.execute = jest.fn(async () => {
      throw new Error("constraint violation");
    });

    const manager = {
      createQueryBuilder: jest.fn().mockReturnValueOnce(statusUpdate).mockReturnValueOnce(declineOverlap1),
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => overlapSelect) })),
    };
    const transaction = jest.fn(async (callback) => callback(manager));
    Database.getInstance.mockResolvedValue({ transaction });
    const repository = new ReservationRepository();

    await expect(repository.acceptInquiryWithOverlapDecline(OVERLAP_ARGS)).rejects.toThrow("constraint violation");
  });
});
