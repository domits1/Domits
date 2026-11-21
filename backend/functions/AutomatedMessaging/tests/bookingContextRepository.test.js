jest.mock("../.shared/integrations/ORM/index.js", () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

const Database = require("../.shared/integrations/ORM/index.js").default;
const { Booking } = require("database/models/Booking");
const { Property } = require("database/models/Property");
const { Property_Check_In } = require("database/models/Property_Check_In");
const { Property_Location } = require("database/models/Property_Location");
const BookingContextRepository = require("../data/bookingContextRepository.js").default;

const rows = {
  booking: { id: "booking-1", property_id: "property-1", guests: 2 },
  property: { id: "property-1", title: "Canal Loft" },
  checkIn: { property_id: "property-1", checkInFrom: "15:00:00", checkOutTill: "11:00:00" },
  location: { property_id: "property-1", street: "Keizersgracht", city: "Amsterdam" },
};

const mockClient = (found = rows) => {
  const findOne = {
    [Booking.options.name]: jest.fn(async () => found.booking),
    [Property.options.name]: jest.fn(async () => found.property),
    [Property_Check_In.options.name]: jest.fn(async () => found.checkIn),
    [Property_Location.options.name]: jest.fn(async () => found.location),
  };
  Database.getInstance.mockResolvedValue({
    getRepository: jest.fn((entity) => ({ findOne: findOne[entity.options.name] })),
  });
  return findOne;
};

describe("BookingContextRepository.getBookingContext", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns the booking with its property, check-in times and location", async () => {
    mockClient();

    await expect(new BookingContextRepository().getBookingContext("booking-1")).resolves.toEqual({
      booking: rows.booking,
      property: rows.property,
      checkIn: rows.checkIn,
      location: rows.location,
    });
  });

  test("looks the check-in times and the location up by the property of the booking", async () => {
    const findOne = mockClient();

    await new BookingContextRepository().getBookingContext("booking-1");

    expect(findOne[Property_Check_In.options.name]).toHaveBeenCalledWith({ where: { property_id: "property-1" } });
    expect(findOne[Property_Location.options.name]).toHaveBeenCalledWith({ where: { property_id: "property-1" } });
  });

  test("gives null for a property that has no check-in row or location", async () => {
    mockClient({ ...rows, checkIn: null, location: null });

    const context = await new BookingContextRepository().getBookingContext("booking-1");

    expect(context).toMatchObject({ booking: rows.booking, checkIn: null, location: null });
  });

  test("returns null and reads nothing else when the booking does not exist", async () => {
    const findOne = mockClient({ ...rows, booking: null });

    await expect(new BookingContextRepository().getBookingContext("missing")).resolves.toBeNull();

    expect(findOne[Property.options.name]).not.toHaveBeenCalled();
    expect(findOne[Property_Check_In.options.name]).not.toHaveBeenCalled();
    expect(findOne[Property_Location.options.name]).not.toHaveBeenCalled();
  });

  test("does not read check-in times or a location for a booking without a property", async () => {
    const findOne = mockClient({ ...rows, booking: { ...rows.booking, property_id: null } });

    const context = await new BookingContextRepository().getBookingContext("booking-1");

    expect(context).toMatchObject({ property: null, checkIn: null, location: null });
    expect(findOne[Property_Check_In.options.name]).not.toHaveBeenCalled();
    expect(findOne[Property_Location.options.name]).not.toHaveBeenCalled();
  });
});
