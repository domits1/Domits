jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("database").default;
const ReservationRepository =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js").default;

const createQueryChain = (rows) => {
  const chain = {};
  ["where", "andWhere"].forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  chain.getMany = jest.fn(async () => rows);
  return chain;
};

const mockRepositoryWithChain = (chain) => {
  const repository = { createQueryBuilder: jest.fn(() => chain) };
  Database.getInstance.mockResolvedValue({ getRepository: jest.fn(() => repository) });
};

const BASE_REQUEST = {
  propertyId: "property-1",
  arrivalDateMs: Date.parse("2026-06-15T00:00:00.000Z"),
  departureDateMs: Date.parse("2026-06-17T00:00:00.000Z"),
  excludeBookingId: "inquiry-1",
};

const collectQueryClauses = (chain) => [...chain.where.mock.calls, ...chain.andWhere.mock.calls];

describe("ReservationRepository overlapping inquiry search", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // The date bounds below are deliberately raw, unlike assertNoBookingConflict which pads them by
  // MIN_CHECK_IN_OUT_GAP_MS. Competing inquiries are only auto-declined on true date overlap, so a
  // back-to-back inquiry inside the turnover gap stays open for the host to decide on.
  it.each([
    {
      clause: "scopes the search to the property being booked",
      query: "booking.property_id = :propertyId",
      params: { propertyId: BASE_REQUEST.propertyId },
    },
    {
      clause: "only considers bookings still in Inquiry status",
      query: "booking.status = :status",
      params: { status: "Inquiry" },
    },
    {
      clause: "excludes the inquiry being accepted",
      query: "booking.id != :excludeBookingId",
      params: { excludeBookingId: BASE_REQUEST.excludeBookingId },
    },
    {
      clause: "matches inquiries starting before the requested departure, unpadded",
      query: "booking.arrivaldate < :departureDateMs",
      params: { departureDateMs: BASE_REQUEST.departureDateMs },
    },
    {
      clause: "matches inquiries ending after the requested arrival, unpadded",
      query: "booking.departuredate > :arrivalDateMs",
      params: { arrivalDateMs: BASE_REQUEST.arrivalDateMs },
    },
  ])("$clause", async ({ query, params }) => {
    const chain = createQueryChain([]);
    mockRepositoryWithChain(chain);
    const repository = new ReservationRepository();

    await repository.getOverlappingInquiries(BASE_REQUEST);

    expect(collectQueryClauses(chain)).toContainEqual([query, params]);
  });

  test("returns the overlapping inquiries the query finds", async () => {
    const rows = [{ id: "inquiry-2" }, { id: "inquiry-3" }];
    const chain = createQueryChain(rows);
    mockRepositoryWithChain(chain);
    const repository = new ReservationRepository();

    await expect(repository.getOverlappingInquiries(BASE_REQUEST)).resolves.toEqual(rows);
  });
});
