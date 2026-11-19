import { describe, expect, jest, test } from "@jest/globals";
import { groupByRoomType, mapRoomRates } from "../../functions/SiteMinder-Integration/util/roomRates.js";

const response = [
  { ratePlanName: "Non-Refundable", ratePlanCode: "NonRef1", roomTypeName: "Dormitory Room", roomTypeCode: "DORM", includedAdultOccupancy: 2 },
  { ratePlanName: "Best Available", ratePlanCode: "BAR", roomTypeName: "Dormitory Room", roomTypeCode: "DORM" },
  { ratePlanName: "", ratePlanCode: "", roomTypeName: "Villa", roomTypeCode: "VILLA" },
];

describe("mapRoomRates", () => {
  test("maps every room rate and fills missing values with null", () => {
    expect(mapRoomRates(response)).toEqual([
      { roomTypeCode: "DORM", roomTypeName: "Dormitory Room", ratePlanCode: "NonRef1", ratePlanName: "Non-Refundable", includedAdultOccupancy: 2 },
      { roomTypeCode: "DORM", roomTypeName: "Dormitory Room", ratePlanCode: "BAR", ratePlanName: "Best Available", includedAdultOccupancy: null },
      { roomTypeCode: "VILLA", roomTypeName: "Villa", ratePlanCode: null, ratePlanName: null, includedAdultOccupancy: null },
    ]);
  });

  test("skips an entry without a roomTypeCode and logs how many were skipped", () => {
    const logger = { warn: jest.fn() };

    expect(mapRoomRates([{ ratePlanCode: "BAR" }, { roomTypeCode: " " }, response[0]], { logger })).toHaveLength(1);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(logger.warn.mock.calls[0][0])).toEqual({
      event: "SITEMINDER_ROOM_RATES_SKIPPED",
      reason: "missing roomTypeCode",
      hotelCode: null,
      skipped: 2,
      total: 3,
    });
  });

  test("puts the hotel code in the skipped log when it is given", () => {
    const logger = { warn: jest.fn() };

    mapRoomRates([{ ratePlanCode: "BAR" }], { logger, hotelCode: "PMSXTEST1" });

    expect(JSON.parse(logger.warn.mock.calls[0][0])).toMatchObject({ hotelCode: "PMSXTEST1", skipped: 1 });
  });

  test("logs nothing when every entry has a roomTypeCode", () => {
    const logger = { warn: jest.fn() };

    mapRoomRates(response, { logger });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  test("refuses a response that is not a list", () => {
    expect(() => mapRoomRates({ errors: [] })).toThrow("not a list");
  });
});

describe("groupByRoomType", () => {
  test("groups the rate plans under their room type", () => {
    expect(groupByRoomType(mapRoomRates(response))).toEqual([
      {
        roomTypeCode: "DORM",
        roomTypeName: "Dormitory Room",
        ratePlans: [
          { ratePlanCode: "NonRef1", ratePlanName: "Non-Refundable", includedAdultOccupancy: 2 },
          { ratePlanCode: "BAR", ratePlanName: "Best Available", includedAdultOccupancy: null },
        ],
      },
      { roomTypeCode: "VILLA", roomTypeName: "Villa", ratePlans: [] },
    ]);
  });

  test("lists a rate plan once when SiteMinder repeats it", () => {
    const twice = mapRoomRates([response[0], response[0]]);
    expect(groupByRoomType(twice)[0].ratePlans).toHaveLength(1);
  });
});
