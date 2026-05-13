jest.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  InvokeCommand: jest.fn().mockImplementation((input) => input),
}));

const originalTestEnv = process.env.TEST;
process.env.TEST = "true";

const BookingService = require("../../functions/General-Bookings-CRUD-Bookings-develop/business/bookingService.js").default;
const ReservationController =
  require("../../functions/General-Bookings-CRUD-Bookings-develop/controller/reservationController.js").default;

const buildCreateEvent = (overrides = {}) => ({
  Authorization: "Bearer token",
  identifiers: {
    property_Id: "domits-property-1",
  },
  general: {
    arrivalDate: "2026-06-01",
    departureDate: "2026-06-03",
    guests: 2,
    guestName: "Guest",
  },
  ...overrides,
});

const buildEvidence = (overrides = {}) => ({
  bookingId: "booking-1",
  trigger: "BOOKING_CREATED",
  syncType: "booking-availability",
  domitsPropertyId: "domits-property-1",
  channexPropertyId: "external-property-1",
  externalRoomTypeId: "room-type-1",
  countOfRooms: 1,
  countOfRoomsSource: "MVP_DEFAULT_SINGLE_UNIT",
  affectedDateRange: { dateFrom: "2026-06-01", dateTo: "2026-06-02" },
  affectedDates: ["2026-06-01", "2026-06-02"],
  availabilityValuesSent: [],
  requestCount: 1,
  taskIds: ["task-1"],
  warnings: [],
  errors: [],
  overallSuccess: true,
  skipped: false,
  ...overrides,
});

const buildService = ({
  bookingType = "direct",
  reservationRepository = {},
  stripeRepository = {},
  channexEvidence = buildEvidence(),
} = {}) => {
  const dependencies = {
    reservationRepository: {
      assertNoBookingConflict: jest.fn(),
      addBookingToTable: jest.fn().mockResolvedValue({
        statusCode: 201,
        hostId: "host-1",
        bookingId: "booking-1",
        propertyId: "domits-property-1",
        dates: {
          arrivalDate: "2026-06-01",
          departureDate: "2026-06-03",
        },
      }),
      getBookingByPaymentId: jest.fn().mockResolvedValue({
        id: "booking-1",
        status: "Awaiting Payment",
      }),
      updateBookingStatus: jest.fn(),
      getBookingById: jest.fn(),
      updateBookingDates: jest.fn(),
      ...reservationRepository,
    },
    stripeRepository: {
      getPaymentIntentByPaymentId: jest.fn().mockResolvedValue({ status: "succeeded" }),
      ...stripeRepository,
    },
    cognitoRepository: {},
    propertyRepository: {
      getPropertyById: jest.fn().mockResolvedValue({
        hostId: "host-1",
        title: "Demo Property",
        bookingType,
      }),
      getCancellationPolicyByPropertyId: jest.fn().mockResolvedValue("strict"),
    },
    authManager: {
      authenticateUser: jest.fn().mockResolvedValue({
        sub: "guest-1",
        email: "guest@example.com",
      }),
    },
    getParamsModel: {},
    externalCalendarService: {
      ensureNoExternalConflict: jest.fn(),
    },
    channexBookingAvailabilityClient: {
      syncAvailabilityForBookingChange: jest.fn().mockResolvedValue(channexEvidence),
    },
    sendEmailFn: jest.fn(),
    getHostEmailByIdFn: jest.fn().mockResolvedValue("host@example.com"),
  };

  return {
    service: new BookingService(dependencies),
    dependencies,
  };
};

describe("BookingService Channex booking availability hooks", () => {
  const originalFlag = process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED;
    } else {
      process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED = originalFlag;
    }
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalTestEnv === undefined) {
      delete process.env.TEST;
    } else {
      process.env.TEST = originalTestEnv;
    }
  });

  test("direct booking creates Awaiting Payment booking and calls bridge once when enabled", async () => {
    process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED = "true";
    const { service, dependencies } = buildService();

    const result = await service.create(buildCreateEvent());

    expect(dependencies.reservationRepository.addBookingToTable).toHaveBeenCalledWith(
      expect.any(Object),
      "guest-1",
      "host-1",
      "strict",
      "Awaiting Payment",
      "direct"
    );
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).toHaveBeenCalledTimes(1);
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).toHaveBeenCalledWith({
      userId: "host-1",
      bookingBefore: null,
      trigger: "BOOKING_CREATED",
      bookingAfter: expect.objectContaining({
        id: "booking-1",
        property_id: "domits-property-1",
        hostid: "host-1",
        guestid: "guest-1",
        status: "Awaiting Payment",
      }),
    });
    expect(result.channexAvailabilitySync).toEqual(buildEvidence());
  });

  test("inquiry booking does not call Channex availability bridge", async () => {
    process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED = "true";
    const { service, dependencies } = buildService({ bookingType: "inquiry" });

    const result = await service.create(buildCreateEvent());

    expect(dependencies.reservationRepository.addBookingToTable).toHaveBeenCalledWith(
      expect.any(Object),
      "guest-1",
      "host-1",
      "strict",
      "Inquiry",
      "inquiry"
    );
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).not.toHaveBeenCalled();
    expect(result.channexAvailabilitySync).toBeUndefined();
  });

  test("payment success does not call Channex availability bridge again", async () => {
    process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED = "true";
    const { service, dependencies } = buildService();

    await expect(service.confirmPayment("pi_1")).resolves.toBe(true);

    expect(dependencies.reservationRepository.updateBookingStatus).toHaveBeenCalledWith("booking-1", "Paid");
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).not.toHaveBeenCalled();
  });

  test("booking response keeps existing payment fields and adds optional evidence", async () => {
    const evidence = buildEvidence();
    const controller = new ReservationController({
      bookingService: {
        create: jest.fn().mockResolvedValue({
          statusCode: 201,
          isInquiry: false,
          hostId: "host-1",
          bookingId: "booking-1",
          propertyId: "domits-property-1",
          dates: {
            arrivalDate: "2026-06-01",
            departureDate: "2026-06-03",
          },
          channexAvailabilitySync: evidence,
        }),
      },
      paymentService: {
        create: jest.fn().mockResolvedValue({
          stripeClientSecret: "secret",
          bookingId: "booking-1",
        }),
      },
    });

    const response = await controller.create({ event: buildCreateEvent() });

    expect(response.response).toEqual({
      stripeClientSecret: "secret",
      bookingId: "booking-1",
      channexAvailabilitySync: evidence,
    });
  });

  test("modify-booking-dates captures before/after, updates dates only, and calls bridge", async () => {
    process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED = "true";
    const bookingBefore = {
      id: "booking-1",
      property_id: "domits-property-1",
      hostid: "host-1",
      guestid: "guest-1",
      arrivaldate: Date.parse("2026-06-01T00:00:00.000Z"),
      departuredate: Date.parse("2026-06-03T00:00:00.000Z"),
      status: "Paid",
      paymentid: "pi_1",
    };
    const bookingAfter = {
      ...bookingBefore,
      arrivaldate: Date.parse("2026-06-04T00:00:00.000Z"),
      departuredate: Date.parse("2026-06-06T00:00:00.000Z"),
    };
    const evidence = buildEvidence({ trigger: "BOOKING_MODIFIED" });
    const { service, dependencies } = buildService({
      channexEvidence: evidence,
      reservationRepository: {
        getBookingById: jest
          .fn()
          .mockResolvedValueOnce({ response: bookingBefore })
          .mockResolvedValueOnce({ response: bookingAfter }),
      },
    });
    dependencies.authManager.authenticateUser.mockResolvedValue({ sub: "host-1" });

    const result = await service.modifyBookingDates(
      "booking-1",
      "2026-06-04",
      "2026-06-06",
      "Bearer host-token"
    );

    expect(dependencies.reservationRepository.assertNoBookingConflict).toHaveBeenCalledWith({
      propertyId: "domits-property-1",
      arrivalDateMs: Date.parse("2026-06-04T00:00:00.000Z"),
      departureDateMs: Date.parse("2026-06-06T00:00:00.000Z"),
      excludeBookingId: "booking-1",
    });
    expect(dependencies.reservationRepository.updateBookingDates).toHaveBeenCalledWith(
      "booking-1",
      Date.parse("2026-06-04T00:00:00.000Z"),
      Date.parse("2026-06-06T00:00:00.000Z")
    );
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).toHaveBeenCalledWith({
      userId: "host-1",
      bookingBefore,
      bookingAfter,
      trigger: "BOOKING_MODIFIED",
    });
    expect(result.bookingBefore).toEqual(bookingBefore);
    expect(result.bookingAfter).toEqual(bookingAfter);
    expect(result.channexAvailabilitySync).toEqual(evidence);
  });

  test("modify-booking-dates is exposed as a non-cancel PATCH action", async () => {
    const modifyBookingDates = jest.fn().mockResolvedValue({
      booking: { id: "booking-1" },
      channexAvailabilitySync: buildEvidence({ trigger: "BOOKING_MODIFIED" }),
    });
    const controller = new ReservationController({
      bookingService: {
        modifyBookingDates,
      },
      paymentService: {},
    });

    const response = await controller.patch({
      headers: { Authorization: "Bearer host-token" },
      body: JSON.stringify({
        action: "modify-booking-dates",
        bookingId: "booking-1",
        arrivalDate: "2026-06-04",
        departureDate: "2026-06-06",
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(modifyBookingDates).toHaveBeenCalledWith(
      "booking-1",
      "2026-06-04",
      "2026-06-06",
      "Bearer host-token"
    );
  });
});
