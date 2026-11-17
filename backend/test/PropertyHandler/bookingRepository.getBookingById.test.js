jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("database").default;
const { BookingRepository } = require("../../functions/PropertyHandler/data/repository/bookingRepository.js");

const createQueryChain = (result) => {
  const chain = {};
  ["select", "where"].forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  chain.getOne = jest.fn(async () => result);
  return chain;
};

const mockRepositoryWithChain = (chain) => {
  const repository = { createQueryBuilder: jest.fn(() => chain) };
  Database.getInstance.mockResolvedValue({ getRepository: jest.fn(() => repository) });
  return repository;
};

describe("BookingRepository.getBookingById", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("queries the booking table by id and selects only guestid, status, property_id", async () => {
    const chain = createQueryChain({ guestid: "guest-1", status: "Paid", property_id: "property-1" });
    const repository = mockRepositoryWithChain(chain);
    const bookingRepository = new BookingRepository();

    await bookingRepository.getBookingById("booking-1");

    expect(repository.createQueryBuilder).toHaveBeenCalledWith("booking");
    expect(chain.select).toHaveBeenCalledWith(["booking.guestid", "booking.status", "booking.property_id"]);
    expect(chain.where).toHaveBeenCalledWith("booking.id = :id", { id: "booking-1" });
  });

  test("maps guestid to guestId and passes status/property_id through unchanged", async () => {
    const chain = createQueryChain({ guestid: "guest-42", status: "Inquiry", property_id: "property-99" });
    mockRepositoryWithChain(chain);
    const bookingRepository = new BookingRepository();

    const result = await bookingRepository.getBookingById("booking-1");

    expect(result).toEqual({
      guestId: "guest-42",
      status: "Inquiry",
      property_id: "property-99",
    });
  });

  test("returns null when no booking matches the id", async () => {
    const chain = createQueryChain(null);
    mockRepositoryWithChain(chain);
    const bookingRepository = new BookingRepository();

    const result = await bookingRepository.getBookingById("nonexistent-booking");

    expect(result).toBeNull();
  });
});
