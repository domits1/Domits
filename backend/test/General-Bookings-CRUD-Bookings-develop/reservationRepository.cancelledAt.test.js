import { DataSource } from "typeorm";
import { Booking } from "database/models/Booking";

jest.mock("database", () => ({ __esModule: true, default: { getInstance: jest.fn() } }));

const Database = require("database").default;
const ReservationRepository = require("../../functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js").default;

const NOW = 1792281600000;

const setup = () => {
  const update = {};
  ["update", "set", "where"].forEach((method) => {
    update[method] = jest.fn(() => update);
  });
  update.execute = jest.fn(async () => ({ affected: 1 }));
  const read = { where: jest.fn(() => read), getOne: jest.fn().mockResolvedValue({ id: "booking-1", guestid: "guest-1" }) };
  const client = {
    createQueryBuilder: jest.fn(() => update),
    getRepository: jest.fn(() => ({ createQueryBuilder: () => read })),
  };
  Database.getInstance.mockResolvedValue(client);
  return { repository: new ReservationRepository({}), update };
};

const toUpdateSql = (values) => {
  const dataSource = new DataSource({ type: "postgres", entities: [Booking] });
  return dataSource.buildMetadatas().then(() =>
    dataSource.createQueryBuilder().update(Booking).set(values).where("id = :id", { id: "booking-1" }).getQuery()
  );
};

describe("ReservationRepository cancelled_at", () => {
  beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(NOW));
  afterEach(() => jest.restoreAllMocks());

  // The first cancel time must survive a second cancel, inside the one statement, so two cancels
  // arriving together cannot overwrite each other. This checks the SQL TypeORM really builds.
  test("a status change to Cancelled keeps a time that is already stored", async () => {
    const { repository, update } = setup();

    await repository.updateBookingStatus("booking-1", "Cancelled");

    const values = update.set.mock.calls[0][0];
    expect(values.status).toBe("Cancelled");
    expect(await toUpdateSql(values)).toContain(`"cancelled_at" = COALESCE("cancelled_at", ${NOW})`);
  });

  test("a guest cancellation keeps a time that is already stored", async () => {
    const { repository, update } = setup();
    repository.getBookingById = jest.fn();

    await repository.cancelBookingByGuest("booking-1", "guest-1");

    const values = update.set.mock.calls[0][0];
    expect(values.status).toBe("Cancelled");
    expect(await toUpdateSql(values)).toContain(`"cancelled_at" = COALESCE("cancelled_at", ${NOW})`);
  });

  test("another status change leaves cancelled_at alone", async () => {
    const { repository, update } = setup();

    await repository.updateBookingStatus("booking-1", "Failed");

    expect(update.set).toHaveBeenCalledWith({ status: "Failed" });
  });
});
