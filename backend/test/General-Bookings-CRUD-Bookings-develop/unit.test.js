import { expect, it, describe, jest } from "@jest/globals";
import { handler } from "../../functions/General-Bookings-CRUD-Bookings-develop/index";
import BookingService from "../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingService.js";
import ConflictException from "../../functions/General-Bookings-CRUD-Bookings-develop/util/exception/ConflictException.js";

jest.mock("@aws-sdk/credential-provider-node", () => ({
  fromIni: jest.fn().mockReturnValue(() => Promise.resolve({ accessKeyId: "fake", secretAccessKey: "fake" })),
}));

// Mock sendEmail so tests don't send real emails
jest.mock("../../functions/General-Bookings-CRUD-Bookings-develop/business/sendEmail.js", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

// Mock getHostEmailById to avoid DB dependencies in this unit test
jest.mock("../../functions/General-Bookings-CRUD-Bookings-develop/business/getHostEmailById.js", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue("host@example.com"),
}));

// Tests classes on happy/unhappy paths
describe("BookingEngine (General-Bookings-CRUD-Bookings-develop) function testing /index.js | parseEvent.js", () => {
  it("should throw error at invalid httpMethod", async () => {
    await expect(handler({ httpMethod: "fake" }))
      .rejects.toThrow("Unable to determine request type. Please contact the Admin.");
  });
  it("should throw error at empty POST", async () => {
    await expect(handler({ httpMethod: "POST" }))
      .rejects.toThrow("Unable to parse your request!");
  });
  it("should throw error at empty GET", async () => {
    await expect(handler({ httpMethod: "GET" }))
      .rejects.toThrow("Unable to parse your request");
  });
  it("should throw error at empty PATCH", async () => {
    expect(handler({ httpMethod: "PATCH" })).rejects;
  });
});

// New overlap test (uses an in-memory stubbed repository, no real DB)
describe("BookingService.create - overlap prevention", () => {
  it("should throw ConflictException when creating an overlapping booking", async () => {
    const bookingService = new BookingService();

    // In-memory list to simulate bookings
    const bookings = [];

    // Stub reservationRepository to avoid real DB
    bookingService.reservationRepository = {
      async addBookingToTable(requestBody, userId, hostId) {
        const arrival = new Date(requestBody.general.arrivalDate).getTime();
        const departure = new Date(requestBody.general.departureDate).getTime();

        // Simple overlap check with current in-memory bookings
        const overlap = bookings.find(
          (b) =>
            b.property_id === requestBody.identifiers.property_Id &&
            b.arrivaldate < departure &&
            b.departuredate > arrival &&
            ["Awaiting Payment", "Paid"].includes(b.status)
        );

        if (overlap) {
          throw new ConflictException("Selected dates are no longer available for this property.");
        }

        const id = `booking-${bookings.length + 1}`;
        const newBooking = {
          id,
          property_id: requestBody.identifiers.property_Id,
          arrivaldate: arrival,
          departuredate: departure,
          status: "Awaiting Payment",
        };
        bookings.push(newBooking);

        return {
          statusCode: 201,
          hostId: hostId,
          bookingId: id,
          propertyId: requestBody.identifiers.property_Id,
          dates: {
            arrivalDate: requestBody.general.arrivalDate,
            departureDate: requestBody.general.departureDate,
          },
        };
      },
    };

    // Stub auth + property to avoid AWS/DB
    bookingService.authManager = {
      authenticateUser: jest.fn().mockResolvedValue({ email: "guest@example.com", sub: "guest-1" }),
    };
    bookingService.propertyRepository = {
      getPropertyById: jest.fn().mockResolvedValue({ hostId: "host-1", title: "Test Property" }),
    };

    const baseEvent = {
      Authorization: "dummy-token",
      identifiers: {
        property_Id: "property-1",
      },
      general: {
        guests: 2,
        arrivalDate: "2025-01-01T00:00:00.000Z",
        departureDate: "2025-01-05T00:00:00.000Z",
        guestName: "Test Guest",
      },
      tax: {},
    };

    // 1) First booking - should succeed
    await expect(bookingService.create(baseEvent)).resolves.toMatchObject({
      statusCode: 201,
      bookingId: expect.any(String),
    });
    expect(bookings).toHaveLength(1);

    // 2) Overlapping booking (Jan 3–Jan 7) - should fail with ConflictException
    const overlappingEvent = {
      ...baseEvent,
      general: {
        ...baseEvent.general,
        arrivalDate: "2025-01-03T00:00:00.000Z",
        departureDate: "2025-01-07T00:00:00.000Z",
      },
    };

    await expect(bookingService.create(overlappingEvent)).rejects.toBeInstanceOf(ConflictException);
    expect(bookings).toHaveLength(1); // still only the first booking
  });
});
