jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "database";
import { Booking } from "database/models/Booking";
import { Invoice } from "database/models/Invoice";
import { Repository } from "../../functions/General-Invoicing-CRUD/data/repository.js";
import { BadRequestException } from "../../functions/General-Invoicing-CRUD/util/exception/badRequestException.js";

const createBuilder = (overrides = {}) => ({
  where: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  into: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
  getRawOne: jest.fn().mockResolvedValue({ count: "0" }),
  execute: jest.fn().mockResolvedValue({ raw: [{ id: "invoice-1" }] }),
  ...overrides,
});

const bookingDefaults = {
  id: "booking-1",
  hostid: "host-1",
  hostname: "Property",
  guestname: "Guest",
  property_id: "property-1",
  arrivaldate: 1790000000000,
  departuredate: 1790086400000,
  bookingtype: "direct",
  total_price: 100,
  currency: null,
};

const setup = (bookingOverrides = {}) => {
  const booking = { ...bookingDefaults, ...bookingOverrides };
  const bookingBuilder = createBuilder({ getOne: jest.fn().mockResolvedValue(booking) });
  const existingInvoiceBuilder = createBuilder({ getOne: jest.fn().mockResolvedValue(null) });
  const sequenceBuilder = createBuilder({ getRawOne: jest.fn().mockResolvedValue({ count: "0" }) });
  const insertBuilder = createBuilder({ execute: jest.fn().mockResolvedValue({ raw: [{ id: "invoice-1" }] }) });
  const bookingRepository = { createQueryBuilder: jest.fn().mockReturnValue(bookingBuilder) };
  const invoiceRepository = {
    createQueryBuilder: jest.fn().mockReturnValueOnce(existingInvoiceBuilder).mockReturnValueOnce(sequenceBuilder),
  };
  const client = {
    getRepository: jest.fn((entity) => (entity === Booking ? bookingRepository : invoiceRepository)),
    createQueryBuilder: jest.fn().mockReturnValue(insertBuilder),
  };
  Database.getInstance.mockResolvedValue(client);

  return { booking, client, insertBuilder, repository: new Repository() };
};

describe("General invoicing repository money amounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("stores an EUR invoice with exact minor-unit values alongside decimal compatibility values", async () => {
    const { repository, insertBuilder } = setup();

    await repository.createInvoiceForBooking("booking-1", "host-1", 123.45, 2, 61.725);

    expect(insertBuilder.values).toHaveBeenCalledWith(expect.objectContaining({
      currency: "EUR",
      rate_per_night: "61.73",
      rate_per_night_minor: "6173",
      gross_amount: "123.45",
      gross_amount_minor: "12345",
      commission_amount: "12.35",
      commission_amount_minor: "1235",
      net_amount: "111.10",
      net_amount_minor: "11110",
    }));
  });

  test("uses the historical EUR contract for an older Channex booking with a stored amount and no currency", async () => {
    const { repository, insertBuilder } = setup({
      bookingtype: "channex",
      total_price: 250,
      currency: null,
    });

    await repository.createInvoiceForBooking("booking-1", "host-1", 250, 2, 125);

    expect(insertBuilder.values).toHaveBeenCalledWith(expect.objectContaining({
      currency: "EUR",
      gross_amount_minor: "25000",
    }));
  });

  test("does not guess the currency for a Channex booking without a stored amount or currency", async () => {
    const { repository, insertBuilder } = setup({
      bookingtype: "channex",
      total_price: null,
      currency: null,
    });

    await expect(
      repository.createInvoiceForBooking("booking-1", "host-1", 250, 2, 125)
    ).rejects.toThrow(BadRequestException);
    expect(insertBuilder.values).not.toHaveBeenCalled();
  });

  test("rejects currencies whose exponent cannot fit the NUMERIC(10,2) compatibility fields", async () => {
    const { repository, insertBuilder } = setup({ currency: "BHD" });

    await expect(
      repository.createInvoiceForBooking("booking-1", "host-1", 10, 2, 5)
    ).rejects.toThrow(/at most two fraction digits/i);
    expect(insertBuilder.values).not.toHaveBeenCalled();
  });
});
