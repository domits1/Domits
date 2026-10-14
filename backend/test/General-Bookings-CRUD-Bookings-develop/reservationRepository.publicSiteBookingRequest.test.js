jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("database").default;
const ReservationRepository = require("../../functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js").default;

const createBuilder = ({ executeResult = { identifiers: [] }, getOneResult = null } = {}) => {
  const builder = {};
  ["insert", "into", "values", "where", "select"].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.execute = jest.fn(async () => executeResult);
  builder.getOne = jest.fn(async () => getOneResult);
  return builder;
};

const buildClient = ({ insertBuilder, selectBuilder }) => ({
  createQueryBuilder: jest.fn(() => insertBuilder),
  getRepository: jest.fn(() => ({ createQueryBuilder: jest.fn(() => selectBuilder) })),
});

const ROW = { id: "booking-1", idempotency_key: "idem-1", public_booking_ref: "DBW-ABCDEFGHJK" };

describe("ReservationRepository public site booking request", () => {
  test("createPublicSiteBookingRequest inserts the given values and returns them", async () => {
    const insertBuilder = createBuilder();
    Database.getInstance.mockResolvedValue(buildClient({ insertBuilder, selectBuilder: createBuilder() }));
    const values = { id: "booking-1", status: "Inquiry", booking_source: "STANDALONE_SITE", idempotency_key: "idem-1" };

    await expect(new ReservationRepository().createPublicSiteBookingRequest(values)).resolves.toEqual(values);

    expect(insertBuilder.insert).toHaveBeenCalledTimes(1);
    expect(insertBuilder.values).toHaveBeenCalledWith(values);
    expect(insertBuilder.execute).toHaveBeenCalledTimes(1);
  });

  test("createPublicSiteBookingRequest lets a unique violation surface untouched", async () => {
    const violation = Object.assign(new Error("duplicate key"), { code: "23505", constraint: "booking_idempotency_key_unique" });
    const insertBuilder = createBuilder();
    insertBuilder.execute = jest.fn(async () => {
      throw violation;
    });
    Database.getInstance.mockResolvedValue(buildClient({ insertBuilder, selectBuilder: createBuilder() }));

    await expect(new ReservationRepository().createPublicSiteBookingRequest({ id: "booking-1" })).rejects.toBe(violation);
  });

  test("getByIdempotencyKey looks the booking up by key and returns null when absent", async () => {
    const selectBuilder = createBuilder({ getOneResult: ROW });
    Database.getInstance.mockResolvedValue(buildClient({ insertBuilder: createBuilder(), selectBuilder }));

    await expect(new ReservationRepository().getByIdempotencyKey("idem-1")).resolves.toEqual(ROW);
    expect(selectBuilder.where).toHaveBeenCalledWith("booking.idempotency_key = :idempotencyKey", { idempotencyKey: "idem-1" });

    const emptyBuilder = createBuilder({ getOneResult: null });
    Database.getInstance.mockResolvedValue(buildClient({ insertBuilder: createBuilder(), selectBuilder: emptyBuilder }));
    await expect(new ReservationRepository().getByIdempotencyKey("idem-2")).resolves.toBeNull();
  });

  test("getBookingById selects the direct booking website columns the host dashboard renders", async () => {
    const selectBuilder = createBuilder({ getOneResult: ROW });
    Database.getInstance.mockResolvedValue(buildClient({ insertBuilder: createBuilder(), selectBuilder }));

    await new ReservationRepository().getBookingById("booking-1");

    expect(selectBuilder.select).toHaveBeenCalledWith(
      expect.arrayContaining(["booking.booking_source", "booking.site_id", "booking.guest_email", "booking.public_booking_ref"])
    );
  });

  test("getByPublicBookingRef looks the booking up by reference", async () => {
    const selectBuilder = createBuilder({ getOneResult: ROW });
    Database.getInstance.mockResolvedValue(buildClient({ insertBuilder: createBuilder(), selectBuilder }));

    await expect(new ReservationRepository().getByPublicBookingRef("DBW-ABCDEFGHJK")).resolves.toEqual(ROW);
    expect(selectBuilder.where).toHaveBeenCalledWith("booking.public_booking_ref = :publicBookingRef", {
      publicBookingRef: "DBW-ABCDEFGHJK",
    });
  });
});
