import { describe, expect, it, jest } from "@jest/globals";
import { AuthManager } from "../../functions/PropertyHandler/auth/authManager.js";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import { PropertyService } from "../../functions/PropertyHandler/business/service/propertyService.js";

const buildAuthManager = ({ username = "caller-user", property, membership = null }) => {
  const authManager = new AuthManager();
  authManager.getAuthorizedUser = jest.fn().mockResolvedValue({ Username: username });
  authManager.propertyRepository = {
    getPropertyById: jest.fn().mockResolvedValue(property),
  };
  authManager.teamMemberRepository = {
    findActiveMembershipByMemberAndHost: jest.fn().mockResolvedValue(membership),
  };
  return authManager;
};

const buildCalendarController = ({
  authorizeResult = "owner-host",
  authorizeError = null,
  previousOverrides = [{ date: 20260610, isAvailable: true }],
  updatedOverrides = [{ date: 20260610, isAvailable: true }],
} = {}) => {
  const controller = new PropertyController();
  controller.authManager = {
    authorizePropertyCalendarOverrideRequest: authorizeError
      ? jest.fn().mockRejectedValue(authorizeError)
      : jest.fn().mockResolvedValue(authorizeResult),
  };
  controller.propertyService = {
    getPropertyCalendarOverrides: jest.fn().mockResolvedValue(previousOverrides),
    updatePropertyCalendarOverrides: jest.fn().mockResolvedValue(updatedOverrides),
  };
  return controller;
};

const forbiddenError = (message = "Forbidden") => {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
};

describe("PropertyController calendar override normalization", () => {
  it("normalizes per-date restriction fields to camelCase values", () => {
    const controller = new PropertyController();

    const [override] = controller.normalizeCalendarOverridesPayload([
      {
        date: "2026-05-01",
        isAvailable: false,
        nightlyPrice: "125",
        stopSell: true,
        closedToArrival: "1",
        closedToDeparture: 0,
        minStay: "2",
        maxStay: "7",
      },
    ]);

    expect(override).toEqual({
      calendarDate: 20260501,
      isAvailable: false,
      nightlyPrice: 125,
      priceLabsIgnored: null,
      stopSell: true,
      closedToArrival: true,
      closedToDeparture: false,
      minStay: 2,
      maxStay: 7,
    });
  });

  it("leaves new restriction fields unset when omitted", () => {
    const controller = new PropertyController();

    const [override] = controller.normalizeCalendarOverridesPayload([
      {
        date: 20260502,
        isAvailable: false,
        nightlyPrice: 150,
      },
    ]);

    expect(override).toMatchObject({
      calendarDate: 20260502,
      isAvailable: false,
      nightlyPrice: 150,
      stopSell: null,
      closedToArrival: null,
      closedToDeparture: null,
      minStay: null,
      maxStay: null,
    });
  });

  it("rejects invalid restriction values", () => {
    const controller = new PropertyController();

    expect(() =>
      controller.normalizeCalendarOverridesPayload([
        {
          date: 20260503,
          stopSell: "sometimes",
        },
      ])
    ).toThrow("Calendar override stopSell must be a boolean.");

    expect(() =>
      controller.normalizeCalendarOverridesPayload([
        {
          date: 20260503,
          minStay: -1,
        },
      ])
    ).toThrow("Calendar override minStay must be a number greater than or equal to 0.");
  });
});

describe("Property calendar override authorization", () => {
  it("allows the property owner to edit calendar overrides", async () => {
    const authManager = buildAuthManager({
      username: "owner-host",
      property: { id: "property-1", hostId: "owner-host" },
    });

    await expect(authManager.authorizePropertyCalendarOverrideRequest("token", "property-1")).resolves.toBe(
      "owner-host"
    );
    expect(authManager.teamMemberRepository.findActiveMembershipByMemberAndHost).not.toHaveBeenCalled();
  });

  it("allows an active cohost for the property owner to edit calendar overrides", async () => {
    const authManager = buildAuthManager({
      username: "cohost-user",
      property: { id: "property-1", hostId: "owner-host" },
      membership: { id: "membership-1", status: "active" },
    });

    await expect(authManager.authorizePropertyCalendarOverrideRequest("token", "property-1")).resolves.toBe(
      "owner-host"
    );
    expect(authManager.teamMemberRepository.findActiveMembershipByMemberAndHost).toHaveBeenCalledWith(
      "cohost-user",
      "owner-host"
    );
  });

  it("rejects users without owner or active cohost access", async () => {
    const authManager = buildAuthManager({
      username: "other-user",
      property: { id: "property-1", hostId: "owner-host" },
    });

    await expect(authManager.authorizePropertyCalendarOverrideRequest("token", "property-1")).rejects.toThrow(
      "You must be the owner or an active co-host of the property to access it."
    );
  });

  it("uses calendar override authorization for GET and PATCH requests", async () => {
    const controller = buildCalendarController();
    const getResponse = await controller.getPropertyCalendarOverrides({
      headers: { Authorization: "token" },
      queryStringParameters: { propertyId: "property-1" },
    });
    const patchResponse = await controller.updatePropertyCalendarOverrides({
      headers: { Authorization: "token" },
      body: JSON.stringify({
        propertyId: "property-1",
        overrides: [{ date: 20260610, isAvailable: true }],
      }),
    });

    expect(getResponse.statusCode).toBe(200);
    expect(patchResponse.statusCode).toBe(200);
    expect(controller.authManager.authorizePropertyCalendarOverrideRequest).toHaveBeenCalledTimes(2);
    expect(controller.propertyService.updatePropertyCalendarOverrides).toHaveBeenCalledWith(
      "property-1",
      [
        expect.objectContaining({
          calendarDate: 20260610,
          isAvailable: true,
        }),
      ],
      {},
      []
    );
    expect(JSON.parse(patchResponse.body)).toEqual({
      propertyId: "property-1",
      overrides: [{ date: 20260610, isAvailable: true }],
    });
    expect(JSON.parse(patchResponse.body)).not.toHaveProperty("channexCalendarChangeSync");
  });

  it("passes an availability change for the outbox to the save", async () => {
    const controller = buildCalendarController({
      previousOverrides: [{ date: 20260610, isAvailable: false }],
      updatedOverrides: [{ date: 20260610, isAvailable: true }],
    });

    const response = await controller.updatePropertyCalendarOverrides({
      headers: { Authorization: "token" },
      body: JSON.stringify({
        propertyId: "property-1",
        overrides: [{ date: 20260610, isAvailable: true }],
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(controller.propertyService.updatePropertyCalendarOverrides).toHaveBeenCalledWith(
      "property-1",
      expect.any(Array),
      {},
      [
        {
          domitsPropertyId: "property-1",
          changeTypes: ["availability"],
          dateFrom: "2026-06-10",
          dateTo: "2026-06-10",
          source: "CALENDAR",
        },
      ]
    );
  });

  it("passes a rates and restrictions change for the outbox to the save", async () => {
    const controller = buildCalendarController({
      previousOverrides: [
        {
          date: 20260610,
          isAvailable: true,
          nightlyPrice: 100,
          stopSell: false,
          closedToArrival: false,
          closedToDeparture: false,
          minStay: 1,
          maxStay: 0,
        },
      ],
      updatedOverrides: [
        {
          date: 20260610,
          isAvailable: true,
          nightlyPrice: 125,
          stopSell: true,
          closedToArrival: true,
          closedToDeparture: false,
          minStay: 2,
          maxStay: 5,
        },
      ],
    });

    const response = await controller.updatePropertyCalendarOverrides({
      headers: { Authorization: "token" },
      body: JSON.stringify({
        propertyId: "property-1",
        overrides: [
          {
            date: 20260610,
            isAvailable: true,
            nightlyPrice: 125,
            stopSell: true,
            closedToArrival: true,
            closedToDeparture: false,
            minStay: 2,
            maxStay: 5,
          },
        ],
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(controller.propertyService.updatePropertyCalendarOverrides).toHaveBeenCalledWith(
      "property-1",
      expect.any(Array),
      {},
      [
        expect.objectContaining({ changeTypes: ["rates"], dateFrom: "2026-06-10", dateTo: "2026-06-10" }),
        expect.objectContaining({ changeTypes: ["restrictions"], dateFrom: "2026-06-10", dateTo: "2026-06-10" }),
      ]
    );
  });

  // Design D9: a row never covers a date its change type did not change.
  it("writes one outbox change per run of consecutive changed dates", async () => {
    const controller = buildCalendarController({
      previousOverrides: [
        { date: 20260610, isAvailable: false },
        { date: 20260611, isAvailable: false },
        { date: 20260620, isAvailable: false },
      ],
    });

    await controller.updatePropertyCalendarOverrides({
      headers: { Authorization: "token" },
      body: JSON.stringify({
        propertyId: "property-1",
        overrides: [
          { date: 20260620, isAvailable: true },
          { date: 20260610, isAvailable: true },
          { date: 20260611, isAvailable: true },
        ],
      }),
    });

    expect(controller.propertyService.updatePropertyCalendarOverrides).toHaveBeenCalledWith(
      "property-1",
      expect.any(Array),
      {},
      [
        expect.objectContaining({ changeTypes: ["availability"], dateFrom: "2026-06-10", dateTo: "2026-06-11" }),
        expect.objectContaining({ changeTypes: ["availability"], dateFrom: "2026-06-20", dateTo: "2026-06-20" }),
      ]
    );
  });

  it("keeps a run going across a month boundary", async () => {
    const controller = buildCalendarController({
      previousOverrides: [
        { date: 20260630, isAvailable: false },
        { date: 20260701, isAvailable: false },
      ],
    });

    await controller.updatePropertyCalendarOverrides({
      headers: { Authorization: "token" },
      body: JSON.stringify({
        propertyId: "property-1",
        overrides: [
          { date: 20260630, isAvailable: true },
          { date: 20260701, isAvailable: true },
        ],
      }),
    });

    expect(controller.propertyService.updatePropertyCalendarOverrides).toHaveBeenCalledWith(
      "property-1",
      expect.any(Array),
      {},
      [expect.objectContaining({ dateFrom: "2026-06-30", dateTo: "2026-07-01" })]
    );
  });

  it("keeps unauthorized calendar override requests forbidden", async () => {
    const controller = buildCalendarController({
      authorizeError: forbiddenError("You must be the owner or an active co-host of the property to access it."),
    });

    const response = await controller.updatePropertyCalendarOverrides({
      headers: { Authorization: "token" },
      body: JSON.stringify({
        propertyId: "property-1",
        overrides: [{ date: 20260610, isAvailable: true }],
      }),
    });

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body)).toBe("You must be the owner or an active co-host of the property to access it.");
    expect(controller.propertyService.updatePropertyCalendarOverrides).not.toHaveBeenCalled();
  });
});

describe("Property public calendar availability response", () => {
  it("includes explicit available override dates for guest listing availability", async () => {
    const service = new PropertyService();
    service.propertyExternalCalendarRepository = {
      getAvailabilitySnapshotByPropertyId: jest.fn().mockResolvedValue({
        externalBlockedDates: ["2026-06-18"],
      }),
    };
    service.propertyCalendarOverrideRepository = {
      getOverridesByPropertyId: jest.fn().mockResolvedValue([
        { date: 20260610, isAvailable: true },
        { date: 20260619, isAvailable: false },
      ]),
    };
    service.bookingRepository = {
      getBlockedDateKeysByPropertyId: jest.fn().mockResolvedValue(["2026-06-20"]),
    };

    const response = await service.getPublicCalendarAvailability("property-1");

    expect(response.availableDateKeys).toEqual(["2026-06-10"]);
    expect(response.unavailableDateKeys).toEqual(["2026-06-19", "2026-06-20"]);
    expect(response.externalBlockedDates).toEqual(["2026-06-18"]);
  });
});
