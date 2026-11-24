jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const { FindOperator } = require("typeorm");
const Database = require("database").default;
const { Property_Owner_Property } = require("database/models/Property_Owner_Property");
const { Booking } = require("database/models/Booking");
const { Invoice } = require("database/models/Invoice");
const { Repository } = require("../../functions/property-owners/data/repository.js");

const OWNER_ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const PERIOD_START = Date.UTC(2026, 10, 1);
const PERIOD_END = Date.UTC(2026, 11, 1);

const createDataSource = ({ assignments = [], bookings = [], invoices = [] } = {}) => {
  const assignmentRepository = { find: jest.fn(async () => assignments) };
  const bookingQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () => bookings),
  };
  const bookingRepository = { createQueryBuilder: jest.fn(() => bookingQueryBuilder) };
  const invoiceRepository = { find: jest.fn(async () => invoices) };
  const repositories = new Map([
    [Property_Owner_Property, assignmentRepository],
    [Booking, bookingRepository],
    [Invoice, invoiceRepository],
  ]);
  const dataSource = { getRepository: jest.fn((entity) => repositories.get(entity)) };
  Database.getInstance.mockResolvedValue(dataSource);
  return { dataSource, assignmentRepository, bookingQueryBuilder, invoiceRepository };
};

beforeEach(() => {
  Database.getInstance.mockReset();
});

describe("Repository.findAssignmentsByOwnerAndHostForPeriod", () => {
  test("loads only this owner's assignments that overlap the requested window", async () => {
    const assignments = [{ owner_id: OWNER_ID, host_id: "host-1", property_id: "property-1" }];
    const { assignmentRepository } = createDataSource({ assignments });

    await expect(
      new Repository().findAssignmentsByOwnerAndHostForPeriod(OWNER_ID, "host-1", PERIOD_START, PERIOD_END)
    ).resolves.toBe(assignments);

    const { where, order } = assignmentRepository.find.mock.calls[0][0];
    expect(where).toHaveLength(2);
    expect(where.every((branch) => branch.owner_id === OWNER_ID && branch.host_id === "host-1")).toBe(true);
    expect(where.every((branch) => branch.effective_from.type === "lessThan")).toBe(true);
    expect(where[0].effective_to.type).toBe("isNull");
    expect(where[1].effective_to.type).toBe("moreThan");
    expect(where[1].effective_to.value).toBe(PERIOD_START);
    expect(where[0].effective_from.value).toBe(PERIOD_END);
    expect(order).toEqual({ effective_from: "ASC", created_at: "ASC" });
  });

  test("rejects an invalid reporting window before reading the database", async () => {
    await expect(
      new Repository().findAssignmentsByOwnerAndHostForPeriod(OWNER_ID, "host-1", PERIOD_END, PERIOD_START)
    ).rejects.toThrow(/reporting window/);
    expect(Database.getInstance).not.toHaveBeenCalled();
  });
});

describe("Repository.findBookingFinancialCandidates", () => {
  test("queries candidate bookings by host, owned properties and either candidate date condition", async () => {
    const bookings = [{ id: "booking-1" }];
    const { bookingQueryBuilder } = createDataSource({ bookings });

    await expect(new Repository().findBookingFinancialCandidates({
      hostId: "host-1",
      propertyIds: ["property-1", "property-2"],
      periodStartMs: PERIOD_START,
      periodEndMs: PERIOD_END,
      limit: 25,
      offset: 50,
    })).resolves.toBe(bookings);

    expect(bookingQueryBuilder.select).toHaveBeenCalledWith(expect.arrayContaining([
      "booking.id",
      "booking.total_price",
      "booking.currency",
      "booking.paymentid",
      "booking.refunded_amount",
      "booking.refund_status",
    ]));
    expect(bookingQueryBuilder.where).toHaveBeenCalledWith("booking.hostid = :hostId", { hostId: "host-1" });
    expect(bookingQueryBuilder.andWhere).toHaveBeenNthCalledWith(
      1,
      "booking.property_id IN (:...propertyIds)",
      { propertyIds: ["property-1", "property-2"] }
    );
    expect(bookingQueryBuilder.andWhere).toHaveBeenNthCalledWith(
      2,
      "((booking.arrivaldate < :periodEndMs AND booking.departuredate > :periodStartMs) OR (booking.createdat >= :periodStartMs AND booking.createdat < :periodEndMs))",
      { periodStartMs: PERIOD_START, periodEndMs: PERIOD_END }
    );
    expect(bookingQueryBuilder.orderBy).toHaveBeenCalledWith("booking.createdat", "ASC");
    expect(bookingQueryBuilder.addOrderBy).toHaveBeenCalledWith("booking.id", "ASC");
    expect(bookingQueryBuilder.skip).toHaveBeenCalledWith(50);
    expect(bookingQueryBuilder.take).toHaveBeenCalledWith(26);
  });

  test("rejects an empty property list before touching the database", async () => {
    await expect(new Repository().findBookingFinancialCandidates({
      hostId: "host-1",
      propertyIds: [],
      periodStartMs: PERIOD_START,
      periodEndMs: PERIOD_END,
      limit: 25,
      offset: 0,
    })).rejects.toThrow(/property ids/);
    expect(Database.getInstance).not.toHaveBeenCalled();
  });
});

describe("Repository.findInvoiceFinancialSnapshots", () => {
  test("reads linked invoice fields for the authenticated host only", async () => {
    const invoices = [{ id: "invoice-1", booking_id: "booking-1" }];
    const { invoiceRepository } = createDataSource({ invoices });

    await expect(new Repository().findInvoiceFinancialSnapshots(["booking-1", "booking-1"], "host-1"))
      .resolves.toBe(invoices);

    const options = invoiceRepository.find.mock.calls[0][0];
    expect(options.select).toEqual(expect.objectContaining({
      booking_id: true,
      gross_amount: true,
      commission_amount: true,
      net_amount: true,
    }));
    expect(options.where.host_id).toBe("host-1");
    expect(options.where.booking_id.type).toBe("in");
    expect(options.where.booking_id.value).toEqual(["booking-1"]);
    expect(options.order).toEqual({ created_at: "ASC" });
  });

  test("returns an empty list without touching the database for an empty booking list", async () => {
    await expect(new Repository().findInvoiceFinancialSnapshots([], "host-1")).resolves.toEqual([]);
    expect(Database.getInstance).not.toHaveBeenCalled();
  });
});
