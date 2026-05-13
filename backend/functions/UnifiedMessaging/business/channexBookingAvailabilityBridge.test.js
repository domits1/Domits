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

const buildBooking = (overrides = {}) => ({
  id: "booking-1",
  property_id: "domits-property-1",
  hostid: "host-1",
  arrivaldate: "2026-06-01",
  departuredate: "2026-06-03",
  status: "Awaiting Payment",
  ...overrides,
});

const buildBridge = ({
  propertyMappings = [
    {
      domitsPropertyId: "domits-property-1",
      externalPropertyId: "external-property-1",
      status: "ACTIVE",
    },
  ],
  roomTypeMappings = [
    {
      domitsPropertyId: "domits-property-1",
      externalPropertyId: "external-property-1",
      externalRoomTypeId: "room-type-1",
      status: "ACTIVE",
    },
  ],
  countOfRooms = 1,
  includeRoomTypeCount = true,
  activeBookings = [buildBooking()],
  providerResult = {
    success: true,
    results: [
      {
        externalPropertyId: "external-property-1",
        externalRoomTypeId: "room-type-1",
        success: true,
        taskId: "task-1",
        warnings: [],
      },
    ],
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
            externalRoomTypeId: "room-type-1",
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
        property_id: "domits-property-1",
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
      "domits-property-1",
      Date.parse("2026-06-01T00:00:00.000Z"),
      Date.parse("2026-06-04T00:00:00.000Z"),
      "booking-1"
    );

    expect(query.mock.calls[0][0]).toContain("LOWER(status) IN ($4, $5)");
    expect(query.mock.calls[0][0]).toContain("AND id <> $6");
    expect(query.mock.calls[0][1]).toEqual([
      "domits-property-1",
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
        externalPropertyId: "external-property-1",
        externalRoomTypeId: "room-type-1",
        values: [
          {
            property_id: "external-property-1",
            room_type_id: "room-type-1",
            date: "2026-06-01",
            availability: 0,
          },
          {
            property_id: "external-property-1",
            room_type_id: "room-type-1",
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
      domitsPropertyId: "domits-property-1",
      channexPropertyId: "external-property-1",
      externalRoomTypeId: "room-type-1",
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
        {
          domitsPropertyId: "domits-property-1",
          externalPropertyId: "external-property-1",
          externalRoomTypeId: "room-type-1",
          status: "ACTIVE",
        },
        {
          domitsPropertyId: "domits-property-1",
          externalPropertyId: "external-property-1",
          externalRoomTypeId: "room-type-2",
          status: "ACTIVE",
        },
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
          {
            externalPropertyId: "external-property-1",
            externalRoomTypeId: "room-type-1",
            success: true,
            taskId: "task-warning",
            warnings: ["provider warning"],
          },
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
          {
            externalPropertyId: "external-property-1",
            externalRoomTypeId: "room-type-1",
            success: false,
            errorCode: "CHANNEX_AVAILABILITY_PUSH_500",
            errorMessage: "Provider failed.",
            httpStatus: 500,
            warnings: [],
          },
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
        externalPropertyId: "external-property-1",
        externalRoomTypeId: "room-type-1",
        errorCode: "CHANNEX_AVAILABILITY_PUSH_500",
        errorMessage: "Provider failed.",
        httpStatus: 500,
      },
    ]);
  });
});
