jest.mock("../../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

import Database from "../../.shared/integrations/ORM/index.js";
import { Tables } from "../../.shared/integrations/ORM/util/database/Tables.js";
import { ChannexAriOutbox } from "database/models/channelManagement/ChannexAriOutbox";
import ChannexExternalBookingImportRepository from "../../.shared/channelManagement/repositories/channexExternalBookingImportRepository.js";

const change = {
  domitsPropertyId: "property-1",
  changeTypes: ["availability"],
  dateFrom: "2026-11-01",
  dateTo: "2026-11-03",
  source: "CHANNEX_IMPORT",
};

const setup = () => {
  const manager = { query: jest.fn().mockResolvedValue([]) };
  const client = {
    options: { schema: "main" },
    query: jest.fn().mockResolvedValue([]),
    transaction: jest.fn(async (work) => work(manager)),
  };
  Database.getInstance.mockResolvedValue(client);
  const channexAriOutboxWriter = { enqueueChannexAriChange: jest.fn().mockResolvedValue(true) };
  const repository = new ChannexExternalBookingImportRepository({ channexAriOutboxWriter });
  repository.getBookingById = jest.fn().mockResolvedValue({ id: "booking-1" });
  return { repository, manager, client, channexAriOutboxWriter };
};

const booking = {
  bookingId: "booking-1",
  propertyId: "property-1",
  hostId: "host-1",
  externalReservationId: "reservation-1",
  guestName: "Guest",
  arrivalDateMs: Date.parse("2026-11-01"),
  departureDateMs: Date.parse("2026-11-04"),
};

describe("ChannexExternalBookingImportRepository Channex outbox rows", () => {
  beforeEach(() => jest.clearAllMocks());

  test("the shared ORM knows the outbox table, so the import can write rows", () => {
    expect(Tables).toContain(ChannexAriOutbox);
  });

  test("an imported booking and its outbox row are saved in one transaction", async () => {
    const { repository, manager, client, channexAriOutboxWriter } = setup();

    await repository.createExternalBooking({ ...booking, channexChanges: [change] });

    expect(client.transaction).toHaveBeenCalledTimes(1);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO"), expect.any(Array));
    expect(client.query).not.toHaveBeenCalled();
    expect(channexAriOutboxWriter.enqueueChannexAriChange).toHaveBeenCalledWith(manager, change);
  });

  test("without a change the insert runs as before, with no transaction and no row", async () => {
    const { repository, client, channexAriOutboxWriter } = setup();

    await repository.createExternalBooking(booking);

    expect(client.transaction).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO"), expect.any(Array));
    expect(channexAriOutboxWriter.enqueueChannexAriChange).not.toHaveBeenCalled();
  });

  test("an imported date change and its outbox row are saved in one transaction", async () => {
    const { repository, manager, channexAriOutboxWriter } = setup();

    await repository.updateImportedBooking({ ...booking, channexChanges: [change] });

    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE"), expect.any(Array));
    expect(channexAriOutboxWriter.enqueueChannexAriChange).toHaveBeenCalledWith(manager, change);
  });

  test("a date change writes one outbox row per stay in the same transaction", async () => {
    const { repository, manager, client, channexAriOutboxWriter } = setup();
    const newStay = { ...change, dateFrom: "2026-11-20", dateTo: "2026-11-21" };

    await repository.updateImportedBooking({ ...booking, channexChanges: [change, newStay] });

    expect(client.transaction).toHaveBeenCalledTimes(1);
    expect(channexAriOutboxWriter.enqueueChannexAriChange).toHaveBeenCalledWith(manager, change);
    expect(channexAriOutboxWriter.enqueueChannexAriChange).toHaveBeenCalledWith(manager, newStay);
  });

  test("an imported cancellation and its outbox row are saved in one transaction", async () => {
    const { repository, manager, channexAriOutboxWriter } = setup();

    await repository.cancelImportedBooking("booking-1", [change]);

    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE"), expect.any(Array));
    expect(channexAriOutboxWriter.enqueueChannexAriChange).toHaveBeenCalledWith(manager, change);
  });
});
