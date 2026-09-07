jest.mock("database", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("database").default;
const ReservationRepository =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/data/reservationRepository.js").default;
const ConflictException =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/ConflictException.js").default;

const MIN_CHECK_IN_OUT_GAP_MS = 60 * 60 * 1000;

const createQueryChain = (conflictCount) => {
  const chain = {};
  ["where", "andWhere"].forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  chain.getCount = jest.fn(async () => conflictCount);
  return chain;
};

const mockRepositoryWithChain = (chain) => {
  const repository = { createQueryBuilder: jest.fn(() => chain) };
  Database.getInstance.mockResolvedValue({ getRepository: jest.fn(() => repository) });
};

const BASE_REQUEST = {
  propertyId: "property-1",
  arrivalDateMs: Date.parse("2026-06-15T14:00:00.000Z"),
  departureDateMs: Date.parse("2026-06-17T11:00:00.000Z"),
};

describe("ReservationRepository same-channel double-booking guard", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("scenario coverage by booking status and self-conflict exclusion", () => {
    it.each([
      {
        description: "an overlapping booking in a blocking status, including an exact duplicate reservation attempt",
        conflictCount: 1,
        excludeBookingId: null,
        shouldReject: true,
      },
      {
        description: "an overlapping booking in a non-blocking status (Cancelled, Declined, Inquiry or Failed)",
        conflictCount: 0,
        excludeBookingId: null,
        shouldReject: false,
      },
      {
        description: "editing the same booking that already occupies the dates",
        conflictCount: 0,
        excludeBookingId: "booking-1",
        shouldReject: false,
      },
    ])("$description", async ({ conflictCount, excludeBookingId, shouldReject }) => {
      const chain = createQueryChain(conflictCount);
      mockRepositoryWithChain(chain);
      const repository = new ReservationRepository();

      const assertion = repository.assertNoBookingConflict({ ...BASE_REQUEST, excludeBookingId });

      if (shouldReject) {
        await expect(assertion).rejects.toThrow(ConflictException);
      } else {
        await expect(assertion).resolves.toBe(undefined);
      }

      const andWhereQueries = chain.andWhere.mock.calls.map((call) => call[0]);
      if (excludeBookingId) {
        expect(chain.andWhere).toHaveBeenCalledWith("booking.id != :excludeBookingId", { excludeBookingId });
      } else {
        expect(andWhereQueries).not.toContain("booking.id != :excludeBookingId");
      }
    });
  });

  test("scopes the conflict query to the requested property", async () => {
    const chain = createQueryChain(0);
    mockRepositoryWithChain(chain);
    const repository = new ReservationRepository();

    await repository.assertNoBookingConflict(BASE_REQUEST);

    expect(chain.where).toHaveBeenCalledWith("booking.property_id = :property_id", {
      property_id: BASE_REQUEST.propertyId,
    });
  });

  test("excludes bookings in non-blocking statuses from the conflict query", async () => {
    const chain = createQueryChain(0);
    mockRepositoryWithChain(chain);
    const repository = new ReservationRepository();

    await repository.assertNoBookingConflict(BASE_REQUEST);

    expect(chain.andWhere).toHaveBeenCalledWith("booking.status NOT IN (:...excludedStatuses)", {
      excludedStatuses: ["Failed", "Declined", "Inquiry", "Cancelled", "Canceled"],
    });
  });

  test("applies the check-in/out buffer gap to the requested arrival and departure dates", async () => {
    const chain = createQueryChain(0);
    mockRepositoryWithChain(chain);
    const repository = new ReservationRepository();

    await repository.assertNoBookingConflict(BASE_REQUEST);

    expect(chain.andWhere).toHaveBeenCalledWith("booking.arrivaldate < :bufferedDepartureDate", {
      bufferedDepartureDate: BASE_REQUEST.departureDateMs + MIN_CHECK_IN_OUT_GAP_MS,
    });
    expect(chain.andWhere).toHaveBeenCalledWith("booking.departuredate > :bufferedArrivalDate", {
      bufferedArrivalDate: BASE_REQUEST.arrivalDateMs - MIN_CHECK_IN_OUT_GAP_MS,
    });
  });
});
