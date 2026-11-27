import {
  buildBookingAwareAvailability,
  getEffectiveAvailability,
  normalizeAvailabilityWindows,
} from "../../.shared/channelManagement/utils/domitsNightAvailability.js";

describe("domitsNightAvailability", () => {
  test.each([
    [1, 0, true, 1],
    [1, 1, false, 0],
    [2, 1, true, 1],
    [2, 3, false, 0],
  ])("sells %p unit(s) with %p active booking(s): available %p, %p left", (sellableUnitCount, activeBookingCount, availability, left) => {
    expect(buildBookingAwareAvailability({ baseAvailability: true, activeBookingCount, sellableUnitCount })).toEqual({
      baseAvailability: true,
      activeBookingCount,
      sellableUnitCount,
      availableUnitCount: left,
      availability,
    });
  });

  test("never sells a night the host closed, whatever the unit count", () => {
    expect(buildBookingAwareAvailability({ baseAvailability: false, activeBookingCount: 0, sellableUnitCount: 3 })).toMatchObject({
      availableUnitCount: 0,
      availability: false,
    });
  });

  test.each([
    [{ isAvailable: false }, true, false],
    [{ isAvailable: true }, false, true],
    [{ isAvailable: null }, true, true],
    [null, false, false],
  ])("lets a calendar override %p win over the availability windows (%p)", (override, isAvailableFromWindows, expected) => {
    expect(getEffectiveAvailability({ override, isAvailableFromWindows })).toBe(expected);
  });

  test("keeps only availability windows with a start and an end, as calendar integers", () => {
    expect(
      normalizeAvailabilityWindows([
        { availableStartDate: "2027-03-01", availableEndDate: "2027-03-31" },
        { availableStartDate: "2027-04-01" },
        null,
      ])
    ).toEqual([{ availableStartDate: 20270301, availableEndDate: 20270331 }]);
  });
});
