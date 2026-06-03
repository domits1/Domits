jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

jest.mock("../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const {
  default: ChannexBookingAvailabilityBridge,
  ChannexBookingAvailabilityRepository,
  getAffectedDateKeysForBookingChange,
  countActiveBookingsByNight,
} = require("./channexBookingAvailabilityBridge.js");
const Database = require("../ORM/index.js").default;

const DOMITS_PROPERTY_ID = "domits-property-1";
const EXTERNAL_PROPERTY_ID = "external-property-1";
const EXTERNAL_ROOM_TYPE_ID = "room-type-1";

const buildBooking = (overrides = {}) => ({
  id: "booking-1",
  property_id: DOMITS_PROPERTY_ID,
  hostid: "host-1",
  arrivaldate: "2026-06-01",
  departuredate: "2026-06-03",
  status: "Awaiting Payment",
  ...overrides,
});

const buildPropertyMapping = (overrides = {}) => ({
  domitsPropertyId: DOMITS_PROPERTY_ID,
  externalPropertyId: EXTERNAL_PROPERTY_ID,
  status: "ACTIVE",
  ...overrides,
});

const buildRoomTypeMapping = (overrides = {}) => ({
  domitsPropertyId: DOMITS_PROPERTY_ID,
  externalPropertyId: EXTERNAL_PROPERTY_ID,
  externalRoomTypeId: EXTERNAL_ROOM_TYPE_ID,
  status: "ACTIVE",
  ...overrides,
});

const buildProviderResult = (overrides = {}) => ({
  externalPropertyId: EXTERNAL_PROPERTY_ID,
  externalRoomTypeId: EXTERNAL_ROOM_TYPE_ID,
  success: true,
  taskId: "task-1",
  warnings: [],
  ...overrides,
});

const buildBridge = ({
  propertyMappings = [buildPropertyMapping()],
  roomTypeMappings = [buildRoomTypeMapping()],
  countOfRooms = 1,
  includeRoomTypeCount = true,
  activeBookings = [buildBooking()],
  providerResult = {
    success: true,
    results: [buildProviderResult()],
  },
} = {}) => {
  const fakes = {
    accounts: {
      findByUserIdAndChannel: jest.fn().mockResolvedValue({
        id: "integration-account-1",
        credentialsRef: "secret-ref",
        status: "CONNECTED",
      }),
    },
    props: {
      listByAccountId: jest.fn().mockResolvedValue(propertyMappings),
    },
    roomTypes: {
      listByAccountId: jest.fn().mockResolvedValue(roomTypeMappings),
    },
    bookingRepository: {
      listActiveBookingsOverlappingRange: jest.fn().mockResolvedValue(activeBookings),
    },
    channexEvidence: {
      create: jest.fn(async (row) => row),
    },
    channexCredentialStore: {
      readSecretOrNull: jest.fn().mockResolvedValue({ apiKey: "secret" }),
    },
    channexProviderClient: {
      listRoomTypes: jest.fn().mockResolvedValue({
        success: true,
        roomTypes: [
          {
            externalRoomTypeId: EXTERNAL_ROOM_TYPE_ID,
            ...(includeRoomTypeCount ? { countOfRooms } : {}),
          },
        ],
      }),
      pushAvailability: jest.fn().mockResolvedValue(providerResult),
      pushRestrictions: jest.fn(),
      pushRates: jest.fn(),
      syncChannexFull: jest.fn(),
    },
  };

  return {
    bridge: new ChannexBookingAvailabilityBridge(fakes),
    fakes,
  };
};

describe("ChannexBookingAvailabilityBridge", () => {
  test("create affected nights use check-in inclusive and check-out exclusive", () => {
    expect(
      getAffectedDateKeysForBookingChange({
        trigger: "BOOKING_CREATED",
        bookingAfter: buildBooking({
          arrivaldate: "2026-06-01",
          departuredate: "2026-06-04",
        }),
      })
    ).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
  });

  test("modify affected nights are the union of old and new dates", () => {
    expect(
      getAffectedDateKeysForBookingChange({
        trigger: "BOOKING_MODIFIED",
        bookingBefore: buildBooking({
          arrivaldate: "2026-06-01",
          departuredate: "2026-06-03",
        }),
        bookingAfter: buildBooking({
          arrivaldate: "2026-06-02",
          departuredate: "2026-06-05",
        }),
      })
    ).toEqual(["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"]);
  });

  test("cancel affected nights use the original booking dates and exclude checkout", () => {
    expect(
      getAffectedDateKeysForBookingChange({
        trigger: "BOOKING_CANCELLED",
        bookingBefore: buildBooking({
          arrivaldate: "2026-06-01",
          departuredate: "2026-06-03",
          status: "Paid",
        }),
        bookingAfter: buildBooking({
          arrivaldate: "2026-06-01",
          departuredate: "2026-06-03",
          status: "Cancelled",
        }),
      })
    ).toEqual(["2026-06-01", "2026-06-02"]);
  });

  test("counts only active bookings per night", () => {
    expect(
      countActiveBookingsByNight(
        [
          buildBooking({ id: "active-1", status: "Awaiting Payment" }),
          buildBooking({ id: "active-2", status: "Paid", arrivaldate: "2026-06-02", departuredate: "2026-06-04" }),
          buildBooking({ id: "inactive-1", status: "Inquiry" }),
        ],
        ["2026-06-01", "2026-06-02", "2026-06-03"]
      )
    ).toEqual({
      "2026-06-01": 1,
      "2026-06-02": 2,
      "2026-06-03": 1,
    });
  });

  test("repository helper queries active overlapping bookings and can exclude the current booking", async () => {
    const query = jest.fn().mockResolvedValue([
      {
        id: "booking-2",
        property_id: DOMITS_PROPERTY_ID,
        arrivaldate: "2026-06-01",
        departuredate: "2026-06-03",
        status: "Paid",
      },
    ]);
    Database.getInstance.mockResolvedValue({
      options: { schema: "main" },
      query,
    });

    const repository = new ChannexBookingAvailabilityRepository();
    const rows = await repository.listActiveBookingsOverlappingRange(
      DOMITS_PROPERTY_ID,
      Date.parse("2026-06-01T00:00:00.000Z"),
      Date.parse("2026-06-04T00:00:00.000Z"),
      "booking-1"
    );

    expect(query.mock.calls[0][0]).toContain("LOWER(status) IN ($4, $5)");
    expect(query.mock.calls[0][0]).toContain("AND id <> $6");
    expect(query.mock.calls[0][1]).toEqual([
      DOMITS_PROPERTY_ID,
      Date.parse("2026-06-01T00:00:00.000Z"),
      Date.parse("2026-06-04T00:00:00.000Z"),
      "awaiting payment",
      "paid",
      "booking-1",
    ]);
    expect(rows).toEqual([
      {
        id: "booking-2",
        property_id: "domits-property-1",
        arrivaldate: Date.parse("2026-06-01T00:00:00.000Z"),
        departuredate: Date.parse("2026-06-03T00:00:00.000Z"),
        status: "Paid",
      },
    ]);
  });

  test("exactly one mapping sends one provider availability request", async () => {
    const { bridge, fakes } = buildBridge({
      countOfRooms: 2,
      activeBookings: [
        buildBooking({ id: "booking-1", arrivaldate: "2026-06-01", departuredate: "2026-06-03" }),
        buildBooking({ id: "booking-2", arrivaldate: "2026-06-01", departuredate: "2026-06-02", status: "Paid" }),
      ],
    });

    const evidence = await bridge.syncAvailabilityForBookingChange({
      userId: "host-1",
      trigger: "BOOKING_CREATED",
      bookingAfter: buildBooking(),
    });

    expect(fakes.channexProviderClient.pushAvailability).toHaveBeenCalledTimes(1);
    expect(fakes.channexProviderClient.pushRestrictions).not.toHaveBeenCalled();
    expect(fakes.channexProviderClient.pushRates).not.toHaveBeenCalled();
    expect(fakes.channexProviderClient.syncChannexFull).not.toHaveBeenCalled();
    expect(fakes.channexProviderClient.pushAvailability.mock.calls[0][1]).toEqual([
      {
        externalPropertyId: EXTERNAL_PROPERTY_ID,
        externalRoomTypeId: EXTERNAL_ROOM_TYPE_ID,
        values: [
          {
            property_id: EXTERNAL_PROPERTY_ID,
            room_type_id: EXTERNAL_ROOM_TYPE_ID,
            date: "2026-06-01",
            availability: 0,
          },
          {
            property_id: EXTERNAL_PROPERTY_ID,
            room_type_id: EXTERNAL_ROOM_TYPE_ID,
            date: "2026-06-02",
            availability: 1,
          },
        ],
      },
    ]);
    expect(evidence).toMatchObject({
      bookingId: "booking-1",
      trigger: "BOOKING_CREATED",
      syncType: "booking-availability",
      domitsPropertyId: DOMITS_PROPERTY_ID,
      channexPropertyId: EXTERNAL_PROPERTY_ID,
      externalRoomTypeId: EXTERNAL_ROOM_TYPE_ID,
      countOfRooms: 2,
      countOfRoomsSource: "CHANNEX_ROOM_TYPE",
      requestCount: 1,
      taskIds: ["task-1"],
      overallSuccess: true,
      skipped: false,
    });
  });

  test("modify counts the already-updated booking without excluding the same booking id", async () => {
    const bookingBefore = buildBooking({
      arrivaldate: "2026-06-01",
      departuredate: "2026-06-03",
    });
    const bookingAfter = buildBooking({
      arrivaldate: "2026-06-04",
      departuredate: "2026-06-06",
    });
    const { bridge, fakes } = buildBridge({
      countOfRooms: 1,
      activeBookings: [bookingAfter],
    });

    const evidence = await bridge.syncAvailabilityForBookingChange({
      userId: "host-1",
      trigger: "BOOKING_MODIFIED",
      bookingBefore,
      bookingAfter,
    });

    expect(fakes.bookingRepository.listActiveBookingsOverlappingRange.mock.calls[0]).toHaveLength(3);
    expect(evidence.affectedDates).toEqual(["2026-06-01", "2026-06-02", "2026-06-04", "2026-06-05"]);
    expect(evidence.availabilityValuesSent.map(({ date, availability }) => ({ date, availability }))).toEqual([
      { date: "2026-06-01", availability: 1 },
      { date: "2026-06-02", availability: 1 },
      { date: "2026-06-04", availability: 0 },
      { date: "2026-06-05", availability: 0 },
    ]);
  });

  test("cancel recalculates current active bookings and restores availability without full sync or restrictions", async () => {
    const bookingBefore = buildBooking({
      arrivaldate: "2026-06-01",
      departuredate: "2026-06-03",
      status: "Paid",
    });
    const bookingAfter = buildBooking({
      arrivaldate: "2026-06-01",
      departuredate: "2026-06-03",
      status: "Cancelled",
    });
    const { bridge, fakes } = buildBridge({
      countOfRooms: 1,
      activeBookings: [],
    });

    const evidence = await bridge.syncAvailabilityForBookingChange({
      userId: "host-1",
      trigger: "BOOKING_CANCELLED",
      bookingBefore,
      bookingAfter,
    });

    expect(fakes.channexProviderClient.pushAvailability).toHaveBeenCalledTimes(1);
    expect(fakes.channexProviderClient.pushRestrictions).not.toHaveBeenCalled();
    expect(fakes.channexProviderClient.pushRates).not.toHaveBeenCalled();
    expect(fakes.channexProviderClient.syncChannexFull).not.toHaveBeenCalled();
    expect(evidence).toMatchObject({
      trigger: "BOOKING_CANCELLED",
      syncType: "booking-availability",
      affectedDates: ["2026-06-01", "2026-06-02"],
      requestCount: 1,
      taskIds: ["task-1"],
      overallSuccess: true,
      skipped: false,
    });
    expect(evidence.availabilityValuesSent.map(({ date, availability }) => ({ date, availability }))).toEqual([
      { date: "2026-06-01", availability: 1 },
      { date: "2026-06-02", availability: 1 },
    ]);
  });

  test("no room type mapping skips without provider call", async () => {
    const { bridge, fakes } = buildBridge({ roomTypeMappings: [] });

    const evidence = await bridge.syncAvailabilityForBookingChange({
      userId: "host-1",
      trigger: "BOOKING_CREATED",
      bookingAfter: buildBooking(),
    });

    expect(fakes.channexProviderClient.pushAvailability).not.toHaveBeenCalled();
    expect(evidence).toMatchObject({
      overallSuccess: false,
      skipped: true,
      reason: "CHANNEX_ROOM_TYPE_MAPPING_MISSING",
    });
  });

  test("multiple room type mappings skip as ambiguous without provider call", async () => {
    const { bridge, fakes } = buildBridge({
      roomTypeMappings: [
        buildRoomTypeMapping(),
        buildRoomTypeMapping({
          externalRoomTypeId: "room-type-2",
        }),
      ],
    });

    const evidence = await bridge.syncAvailabilityForBookingChange({
      userId: "host-1",
      trigger: "BOOKING_CREATED",
      bookingAfter: buildBooking(),
    });

    expect(fakes.channexProviderClient.pushAvailability).not.toHaveBeenCalled();
    expect(evidence).toMatchObject({
      overallSuccess: false,
      skipped: true,
      reason: "CHANNEX_ROOM_TYPE_AMBIGUOUS",
    });
  });

  test("single mapping defaults countOfRooms to one when provider count is unavailable", async () => {
    const { bridge } = buildBridge({
      includeRoomTypeCount: false,
      activeBookings: [buildBooking()],
    });

    const evidence = await bridge.syncAvailabilityForBookingChange({
      userId: "host-1",
      trigger: "BOOKING_CREATED",
      bookingAfter: buildBooking(),
    });

    expect(evidence.countOfRooms).toBe(1);
    expect(evidence.countOfRoomsSource).toBe("MVP_DEFAULT_SINGLE_UNIT");
    expect(evidence.availabilityValuesSent.map((value) => value.availability)).toEqual([0, 0]);
  });

  test("provider warnings make overallSuccess false", async () => {
    const { bridge } = buildBridge({
      providerResult: {
        success: true,
        results: [
          buildProviderResult({
            taskId: "task-warning",
            warnings: ["provider warning"],
          }),
        ],
      },
    });

    const evidence = await bridge.syncAvailabilityForBookingChange({
      userId: "host-1",
      trigger: "BOOKING_CREATED",
      bookingAfter: buildBooking(),
    });

    expect(evidence.overallSuccess).toBe(false);
    expect(evidence.warnings).toEqual(["provider warning"]);
    expect(evidence.taskIds).toEqual(["task-warning"]);
  });

  test("provider errors make overallSuccess false", async () => {
    const { bridge } = buildBridge({
      providerResult: {
        success: false,
        results: [
          buildProviderResult({
            success: false,
            errorCode: "CHANNEX_AVAILABILITY_PUSH_500",
            errorMessage: "Provider failed.",
            httpStatus: 500,
            warnings: [],
          }),
        ],
      },
    });

    const evidence = await bridge.syncAvailabilityForBookingChange({
      userId: "host-1",
      trigger: "BOOKING_CREATED",
      bookingAfter: buildBooking(),
    });

    expect(evidence.overallSuccess).toBe(false);
    expect(evidence.errors).toEqual([
      {
        externalPropertyId: EXTERNAL_PROPERTY_ID,
        externalRoomTypeId: EXTERNAL_ROOM_TYPE_ID,
        errorCode: "CHANNEX_AVAILABILITY_PUSH_500",
        errorMessage: "Provider failed.",
        httpStatus: 500,
      },
    ]);
  });
});
