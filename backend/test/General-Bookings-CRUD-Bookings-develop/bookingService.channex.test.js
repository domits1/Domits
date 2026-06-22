jest.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
  InvokeCommand: jest.fn().mockImplementation((input) => input),
}));

const originalTestEnv = process.env.TEST;
const hadTestEnv = Object.hasOwn(process.env, "TEST");
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
  propertyRepository = {},
  stripeRepository = {},
  channexEvidence = buildEvidence(),
} = {}) => {
  const dependencies = {
    reservationRepository: {
      assertNoBookingConflict: jest.fn(),
      addBookingToTable: jest.fn().mockImplementation(async (requestBody, _userId, hostId) => ({
        statusCode: 201,
        hostId,
        bookingId: "booking-1",
        propertyId: requestBody.identifiers.property_Id,
        dates: {
          arrivalDate: requestBody.general.arrivalDate,
          departureDate: requestBody.general.departureDate,
        },
      })),
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
      getPaymentByPaymentId: jest.fn().mockResolvedValue({ stripeclientsecret: "secret_1" }),
      ...stripeRepository,
    },
    cognitoRepository: {},
    propertyRepository: {
      getPropertyById: jest.fn().mockResolvedValue({
        hostId: "host-1",
        title: "Demo Property",
        bookingType,
      }),
      assertBookingDatesAvailable: jest.fn().mockResolvedValue(true),
      getCancellationPolicyByPropertyId: jest.fn().mockResolvedValue("strict"),
      ...propertyRepository,
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
    priceLabsBookingNotifier: {
      notifyBookingChange: jest.fn(),
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
  const hadOriginalFlag = Object.hasOwn(process.env, "CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED");

  afterEach(() => {
    if (hadOriginalFlag) {
      process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED = originalFlag;
    } else {
      delete process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED;
    }
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (hadTestEnv) {
      process.env.TEST = originalTestEnv;
    } else {
      delete process.env.TEST;
    }
  });

  test("direct booking creates Awaiting Payment booking and calls bridge once when enabled", async () => {
    process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED = "true";
    const { service, dependencies } = buildService();

    const result = await service.create(buildCreateEvent());
    const storedRequest = dependencies.reservationRepository.addBookingToTable.mock.calls[0][0];

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
        arrivaldate: Date.parse("2026-06-01T00:00:00.000Z"),
        departuredate: Date.parse("2026-06-03T00:00:00.000Z"),
      }),
    });
    expect(storedRequest.general.arrivalDate).toBe(Date.parse("2026-06-01T00:00:00.000Z"));
    expect(storedRequest.general.departureDate).toBe(Date.parse("2026-06-03T00:00:00.000Z"));
    expect(Number.isNaN(storedRequest.general.arrivalDate)).toBe(false);
    expect(Number.isNaN(storedRequest.general.departureDate)).toBe(false);
    expect(result.channexAvailabilitySync).toEqual(buildEvidence());
  });

  test("converts valid YYYY-MM-DD dates to millisecond timestamps before storing", async () => {
    const { service, dependencies } = buildService();

    const result = await service.create(
      buildCreateEvent({
        general: {
          arrivalDate: "2026-06-15",
          departureDate: "2026-06-17",
          guests: 2,
          guestName: "Guest",
        },
      })
    );
    const storedRequest = dependencies.reservationRepository.addBookingToTable.mock.calls[0][0];

    expect(storedRequest.general.arrivalDate).toBe(Date.parse("2026-06-15T00:00:00.000Z"));
    expect(storedRequest.general.departureDate).toBe(Date.parse("2026-06-17T00:00:00.000Z"));
    expect(Number.isNaN(storedRequest.general.arrivalDate)).toBe(false);
    expect(Number.isNaN(storedRequest.general.departureDate)).toBe(false);
    expect(result.dates).toEqual({
      arrivalDate: Date.parse("2026-06-15T00:00:00.000Z"),
      departureDate: Date.parse("2026-06-17T00:00:00.000Z"),
    });
  });

  test("invalid create dates return controlled 400 before storage", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { service, dependencies } = buildService();
    const controller = new ReservationController({
      bookingService: service,
      paymentService: {
        create: jest.fn(),
      },
    });

    const response = await controller.create({
      event: buildCreateEvent({
        general: {
          arrivalDate: "2026-02-31",
          departureDate: "2026-06-17",
          guests: 2,
          guestName: "Guest",
        },
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.response).toEqual({ message: "arrivalDate is invalid." });
    expect(dependencies.reservationRepository.addBookingToTable).not.toHaveBeenCalled();
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test("missing create dates return controlled 400 before storage", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const { service, dependencies } = buildService();
    const controller = new ReservationController({
      bookingService: service,
      paymentService: {
        create: jest.fn(),
      },
    });

    const response = await controller.create({
      event: buildCreateEvent({
        general: {
          departureDate: "2026-06-17",
          guests: 2,
          guestName: "Guest",
        },
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.response).toEqual({ message: "arrivalDate is required." });
    expect(dependencies.reservationRepository.addBookingToTable).not.toHaveBeenCalled();
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  test("direct booking validates host calendar availability before storing and syncing", async () => {
    process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED = "true";
    const { service, dependencies } = buildService();

    await service.create(buildCreateEvent());

    expect(dependencies.propertyRepository.assertBookingDatesAvailable).toHaveBeenCalledWith({
      propertyId: "domits-property-1",
      arrivalDateMs: Date.parse("2026-06-01T00:00:00.000Z"),
      departureDateMs: Date.parse("2026-06-03T00:00:00.000Z"),
    });
    expect(dependencies.reservationRepository.addBookingToTable).toHaveBeenCalledTimes(1);
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).toHaveBeenCalledTimes(1);
  });

  test("unavailable host calendar dates reject booking before storage or Channex sync", async () => {
    process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED = "true";
    const unavailableError = new Error("Selected dates are not available.");
    unavailableError.statusCode = 409;
    const { service, dependencies } = buildService({
      propertyRepository: {
        assertBookingDatesAvailable: jest.fn().mockRejectedValue(unavailableError),
      },
    });

    await expect(service.create(buildCreateEvent())).rejects.toBe(unavailableError);

    expect(dependencies.reservationRepository.assertNoBookingConflict).not.toHaveBeenCalled();
    expect(dependencies.reservationRepository.addBookingToTable).not.toHaveBeenCalled();
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).not.toHaveBeenCalled();
    expect(dependencies.sendEmailFn).not.toHaveBeenCalled();
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

  test("getPayment read returns the stored client secret for the booking guest", async () => {
    const { service, dependencies } = buildService({
      reservationRepository: {
        getBookingById: jest.fn().mockResolvedValue({
          response: {
            id: "booking-1",
            guestid: "guest-1",
            paymentid: "pi_1",
          },
        }),
      },
      stripeRepository: {
        getPaymentByPaymentId: jest.fn().mockResolvedValue({
          stripeclientsecret: "secret_1",
        }),
      },
    });

    const result = await service.read({
      Authorization: "Bearer guest-token",
      event: {
        readType: "getPayment",
        bookingId: "booking-1",
      },
    });

    expect(dependencies.reservationRepository.getBookingById).toHaveBeenCalledWith("booking-1");
    expect(dependencies.stripeRepository.getPaymentByPaymentId).toHaveBeenCalledWith("pi_1");
    expect(result).toEqual({
      statusCode: 200,
      response: "secret_1",
    });
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

  test("modify-booking-dates returns a JSON-safe response after successful side effects", async () => {
    const bookingBefore = {
      id: "booking-1",
      property_id: "domits-property-1",
      hostid: "host-1",
      arrivaldate: BigInt(Date.parse("2026-06-01T00:00:00.000Z")),
      departuredate: BigInt(Date.parse("2026-06-03T00:00:00.000Z")),
      status: "Paid",
    };
    const bookingAfter = {
      ...bookingBefore,
      arrivaldate: BigInt(Date.parse("2026-06-04T00:00:00.000Z")),
      departuredate: BigInt(Date.parse("2026-06-06T00:00:00.000Z")),
    };
    const modifyBookingDates = jest.fn().mockResolvedValue({
      booking: bookingAfter,
      bookingBefore,
      bookingAfter,
      channexAvailabilitySync: buildEvidence({
        trigger: "BOOKING_MODIFIED",
        countOfRooms: BigInt(1),
      }),
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
    expect(() => JSON.stringify(response.response)).not.toThrow();
    expect(response.response.booking.arrivaldate).toBe(Date.parse("2026-06-04T00:00:00.000Z"));
    expect(response.response.channexAvailabilitySync.countOfRooms).toBe(1);
  });

  test("cancel paid booking updates status to Cancelled and calls bridge once", async () => {
    process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED = "true";
    const bookingBefore = {
      id: "booking-1",
      property_id: "domits-property-1",
      hostid: "host-1",
      guestid: "guest-1",
      arrivaldate: Date.parse("2026-06-01T00:00:00.000Z"),
      departuredate: Date.parse("2026-06-03T00:00:00.000Z"),
      status: "Paid",
    };
    const bookingAfter = {
      ...bookingBefore,
      status: "Cancelled",
    };
    const evidence = buildEvidence({
      trigger: "BOOKING_CANCELLED",
      affectedDates: ["2026-06-01", "2026-06-02"],
      availabilityValuesSent: [
        { date: "2026-06-01", availability: 1 },
        { date: "2026-06-02", availability: 1 },
      ],
    });
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

    const result = await service.cancelBooking("booking-1", "Bearer host-token", { reason: "Demo cancel" });

    expect(dependencies.reservationRepository.updateBookingStatus).toHaveBeenCalledWith("booking-1", "Cancelled");
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).toHaveBeenCalledTimes(1);
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).toHaveBeenCalledWith({
      userId: "host-1",
      bookingBefore,
      bookingAfter,
      trigger: "BOOKING_CANCELLED",
    });
    expect(result.booking.status).toBe("Cancelled");
    expect(result.reason).toBe("Demo cancel");
    expect(result.channexAvailabilitySync).toEqual(evidence);
  });

  test("cancel awaiting payment booking updates status to Cancelled and calls bridge once", async () => {
    process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED = "true";
    const bookingBefore = {
      id: "booking-1",
      property_id: "domits-property-1",
      hostid: "host-1",
      guestid: "guest-1",
      arrivaldate: Date.parse("2026-06-01T00:00:00.000Z"),
      departuredate: Date.parse("2026-06-03T00:00:00.000Z"),
      status: "Awaiting Payment",
    };
    const bookingAfter = {
      ...bookingBefore,
      status: "Cancelled",
    };
    const evidence = buildEvidence({ trigger: "BOOKING_CANCELLED" });
    const { service, dependencies } = buildService({
      channexEvidence: evidence,
      reservationRepository: {
        getBookingById: jest
          .fn()
          .mockResolvedValueOnce({ response: bookingBefore })
          .mockResolvedValueOnce({ response: bookingAfter }),
      },
    });
    dependencies.authManager.authenticateUser.mockResolvedValue({ sub: "guest-1" });

    const result = await service.cancelBooking("booking-1", "Bearer guest-token");

    expect(dependencies.reservationRepository.updateBookingStatus).toHaveBeenCalledWith("booking-1", "Cancelled");
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).toHaveBeenCalledTimes(1);
    expect(result.booking.status).toBe("Cancelled");
    expect(result.channexAvailabilitySync.trigger).toBe("BOOKING_CANCELLED");
  });

  test("cancel already Cancelled booking is idempotent and does not call Channex", async () => {
    process.env.CHANNEX_BOOKING_AVAILABILITY_SYNC_ENABLED = "true";
    const booking = {
      id: "booking-1",
      property_id: "domits-property-1",
      hostid: "host-1",
      guestid: "guest-1",
      arrivaldate: Date.parse("2026-06-01T00:00:00.000Z"),
      departuredate: Date.parse("2026-06-03T00:00:00.000Z"),
      status: "Cancelled",
    };
    const { service, dependencies } = buildService({
      reservationRepository: {
        getBookingById: jest.fn().mockResolvedValue({ response: booking }),
      },
    });
    dependencies.authManager.authenticateUser.mockResolvedValue({ sub: "host-1" });

    const result = await service.cancelBooking("booking-1", "Bearer host-token");

    expect(dependencies.reservationRepository.updateBookingStatus).not.toHaveBeenCalled();
    expect(dependencies.channexBookingAvailabilityClient.syncAvailabilityForBookingChange).not.toHaveBeenCalled();
    expect(result.alreadyCancelled).toBe(true);
    expect(result.channexAvailabilitySync).toEqual(
      expect.objectContaining({
        trigger: "BOOKING_CANCELLED",
        syncType: "booking-availability",
        skipped: true,
        reason: "BOOKING_ALREADY_CANCELLED",
      })
    );
  });

  test("cancel-booking PATCH action returns Channex cancellation sync evidence", async () => {
    const evidence = buildEvidence({ trigger: "BOOKING_CANCELLED" });
    const bookingBefore = {
      id: "booking-1",
      property_id: "domits-property-1",
      hostid: "host-1",
      guestid: "guest-1",
      arrivaldate: Date.now() + 12 * 60 * 60 * 1000,
      departuredate: Date.now() + 36 * 60 * 60 * 1000,
      cancellation_policy: "flexible",
      total_price: 100,
      paymentid: "pi_booking_1",
      status: "Paid",
    };
    const bookingAfter = { ...bookingBefore, status: "Cancelled" };
    const cancelBookingByGuest = jest.fn().mockResolvedValue({
      response: bookingAfter,
      statusCode: 200,
    });
    const syncChannexBookingAvailabilityIfEnabled = jest.fn().mockResolvedValue(evidence);
    const controller = new ReservationController({
      bookingService: {
        authManager: {
          authenticateUser: jest.fn().mockResolvedValue({ sub: "guest-1" }),
        },
        reservationRepository: {
          getBookingById: jest.fn().mockResolvedValue({ response: bookingBefore }),
          cancelBookingByGuest,
        },
        priceLabsBookingNotifier: {
          notifyBookingChange: jest.fn().mockResolvedValue({}),
        },
        syncChannexBookingAvailabilityIfEnabled,
      },
      paymentService: {},
    });
    controller.stripe = null;

    const response = await controller.patch({
      headers: { Authorization: "Bearer guest-token" },
      body: JSON.stringify({
        action: "cancel-booking",
        bookingId: "booking-1",
        reason: "Demo cancel",
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(cancelBookingByGuest).toHaveBeenCalledWith("booking-1", "guest-1", {
      refundedAmount: 0,
      stripeRefundId: null,
      refundError: null,
    });
    expect(syncChannexBookingAvailabilityIfEnabled).toHaveBeenCalledWith({
      userId: "host-1",
      bookingBefore,
      bookingAfter,
      trigger: "BOOKING_CANCELLED",
      includeDisabledEvidence: true,
    });
    expect(response.response.channexAvailabilitySync).toEqual(evidence);
  });

  test("cancel-booking PATCH action validates bookingId", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const cancelBooking = jest.fn();
    const controller = new ReservationController({
      bookingService: {
        cancelBooking,
      },
      paymentService: {},
    });

    const response = await controller.patch({
      headers: { Authorization: "Bearer host-token" },
      body: JSON.stringify({
        action: "cancel-booking",
      }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.response).toBe("Missing bookingId.");
    expect(cancelBooking).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
