jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("database").default;
const ReservationRepository =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js").default;

const createSelectBuilder = (rows) => {
  const builder = {};
  ["setLock", "where", "andWhere"].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.getMany = jest.fn(async () => rows);
  return builder;
};

const createUpdateBuilder = (result = { affected: 1 }) => {
  const builder = {};
  ["update", "set", "where"].forEach((method) => {
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
  test("locks the full conflict set before writing anything, then accepts the target and declines the rest", async () => {
    const selectBuilder = createSelectBuilder([
      { id: "booking-1", status: "Inquiry" },
      { id: "overlap-1", status: "Inquiry" },
      { id: "overlap-2", status: "Inquiry" },
    ]);
    const targetUpdate = createUpdateBuilder({ affected: 1 });
    const declineOverlap1 = createUpdateBuilder({ affected: 1 });
    const declineOverlap2 = createUpdateBuilder({ affected: 1 });

    const manager = {
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => selectBuilder) })),
      createQueryBuilder: jest.fn().mockReturnValueOnce(targetUpdate).mockReturnValueOnce(declineOverlap1).mockReturnValueOnce(declineOverlap2),
    };
    const transaction = jest.fn(async (callback) => callback(manager));
    Database.getInstance.mockResolvedValue({ transaction });
    const repository = new ReservationRepository();

    const result = await repository.acceptInquiryWithOverlapDecline(OVERLAP_ARGS);

    expect(result).toEqual({ accepted: true, declinedCount: 2 });

    // the locked read must happen before any write
    expect(manager.getRepository).toHaveBeenCalled();
    expect(selectBuilder.setLock).toHaveBeenCalledWith("pessimistic_write");
    expect(selectBuilder.where).toHaveBeenCalledWith("booking.property_id = :propertyId", { propertyId: "property-1" });
    expect(selectBuilder.andWhere).toHaveBeenCalledWith("booking.status = :status", { status: "Inquiry" });
    expect(selectBuilder.andWhere).toHaveBeenCalledWith("booking.arrivaldate < :departureDateMs", { departureDateMs: 2000 });
    expect(selectBuilder.andWhere).toHaveBeenCalledWith("booking.departuredate > :arrivalDateMs", { arrivalDateMs: 1000 });

    expect(targetUpdate.set).toHaveBeenCalledWith({ status: "Awaiting Payment" });
    expect(targetUpdate.where).toHaveBeenCalledWith("id = :id", { id: "booking-1" });
    expect(declineOverlap1.set).toHaveBeenCalledWith({ status: "Declined" });
    expect(declineOverlap1.where).toHaveBeenCalledWith("id = :id", { id: "overlap-1" });
    expect(declineOverlap2.where).toHaveBeenCalledWith("id = :id", { id: "overlap-2" });
  });

  test("returns accepted:false without writing anything when the locked read no longer finds the target as Inquiry", async () => {
    // simulates a concurrent transaction having already accepted/declined this booking
    // before this one acquired the lock
    const selectBuilder = createSelectBuilder([{ id: "overlap-1", status: "Inquiry" }]);
    const createQueryBuilder = jest.fn();
    const manager = {
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => selectBuilder) })),
      createQueryBuilder,
    };
    const transaction = jest.fn(async (callback) => callback(manager));
    Database.getInstance.mockResolvedValue({ transaction });
    const repository = new ReservationRepository();

    const result = await repository.acceptInquiryWithOverlapDecline(OVERLAP_ARGS);

    expect(result).toEqual({ accepted: false, declinedCount: 0 });
    expect(createQueryBuilder).not.toHaveBeenCalled();
  });

  test("returns accepted:true with zero declines when there are no overlapping inquiries", async () => {
    const selectBuilder = createSelectBuilder([{ id: "booking-1", status: "Inquiry" }]);
    const targetUpdate = createUpdateBuilder({ affected: 1 });
    const manager = {
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => selectBuilder) })),
      createQueryBuilder: jest.fn().mockReturnValueOnce(targetUpdate),
    };
    const transaction = jest.fn(async (callback) => callback(manager));
    Database.getInstance.mockResolvedValue({ transaction });
    const repository = new ReservationRepository();

    const result = await repository.acceptInquiryWithOverlapDecline(OVERLAP_ARGS);

    expect(result).toEqual({ accepted: true, declinedCount: 0 });
    expect(manager.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  test("propagates a failure from declining an overlap so the transaction rolls back the target's acceptance too", async () => {
    const selectBuilder = createSelectBuilder([
      { id: "booking-1", status: "Inquiry" },
      { id: "overlap-1", status: "Inquiry" },
    ]);
    const targetUpdate = createUpdateBuilder({ affected: 1 });
    const declineOverlap1 = createUpdateBuilder();
    declineOverlap1.execute = jest.fn(async () => {
      throw new Error("constraint violation");
    });

    const manager = {
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => selectBuilder) })),
      createQueryBuilder: jest.fn().mockReturnValueOnce(targetUpdate).mockReturnValueOnce(declineOverlap1),
    };
    const transaction = jest.fn(async (callback) => callback(manager));
    Database.getInstance.mockResolvedValue({ transaction });
    const repository = new ReservationRepository();

    await expect(repository.acceptInquiryWithOverlapDecline(OVERLAP_ARGS)).rejects.toThrow("constraint violation");
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  const occConflict = () => Object.assign(new Error("change conflicts with another transaction (OC000)"), { code: "40001" });

  test("retries after an optimistic concurrency conflict and returns the retry's fresh result", async () => {
    // the retry re-reads committed state: a concurrent accept already declined this booking
    const selectBuilder = createSelectBuilder([]);
    const manager = {
      getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => selectBuilder) })),
      createQueryBuilder: jest.fn(),
    };
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(occConflict())
      .mockImplementationOnce(async (callback) => callback(manager));
    Database.getInstance.mockResolvedValue({ transaction });
    const repository = new ReservationRepository();

    const result = await repository.acceptInquiryWithOverlapDecline(OVERLAP_ARGS);

    expect(result).toEqual({ accepted: false, declinedCount: 0 });
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  test("gives up and rethrows when the conflict persists across every attempt", async () => {
    const transaction = jest.fn().mockRejectedValue(occConflict());
    Database.getInstance.mockResolvedValue({ transaction });
    const repository = new ReservationRepository();

    await expect(repository.acceptInquiryWithOverlapDecline(OVERLAP_ARGS)).rejects.toMatchObject({ code: "40001" });
    expect(transaction).toHaveBeenCalledTimes(3);
  });
});
