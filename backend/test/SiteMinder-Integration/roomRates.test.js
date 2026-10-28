import { describe, expect, test } from "@jest/globals";
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

  test("skips an entry without a roomTypeCode", () => {
    expect(mapRoomRates([{ ratePlanCode: "BAR" }])).toEqual([]);
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
