import { describe, expect, it } from "@jest/globals";
import {
  isDestinationEligible,
  readDestinationSettings,
} from "../../functions/PropertyHandler/util/destination/destinationSettings.js";

describe("the destination settings", () => {
  it("defaults to one active listing per destination and a parent that exists through any child", () => {
    expect(readDestinationSettings({})).toEqual({ minActiveListings: 1, parentFromAnyChild: true });
  });

  it("reads the two choices from the environment and falls back on nonsense", () => {
    expect(
      readDestinationSettings({ DESTINATION_MIN_ACTIVE_LISTINGS: "3", DESTINATION_PARENT_FROM_ANY_CHILD: "no" })
    ).toEqual({
      minActiveListings: 3,
      parentFromAnyChild: false,
    });
    expect(
      readDestinationSettings({ DESTINATION_MIN_ACTIVE_LISTINGS: "0", DESTINATION_PARENT_FROM_ANY_CHILD: "maybe" })
    ).toEqual({
      minActiveListings: 1,
      parentFromAnyChild: true,
    });
    expect(readDestinationSettings({ DESTINATION_MIN_ACTIVE_LISTINGS: "many" }).minActiveListings).toBe(1);
    expect(readDestinationSettings({ DESTINATION_MIN_ACTIVE_LISTINGS: "3garbage" }).minActiveListings).toBe(1);
    expect(readDestinationSettings({ DESTINATION_MIN_ACTIVE_LISTINGS: "2.9" }).minActiveListings).toBe(1);
    expect(readDestinationSettings({ DESTINATION_MIN_ACTIVE_LISTINGS: "99999999999999999999" }).minActiveListings).toBe(
      1
    );
    expect(readDestinationSettings({ DESTINATION_MIN_ACTIVE_LISTINGS: " 4 " }).minActiveListings).toBe(4);
  });

  it("decides eligibility from the listings, or from the children when the setting allows it", () => {
    const defaults = readDestinationSettings({});
    expect(isDestinationEligible({ activeListings: 1 }, defaults)).toBe(true);
    expect(isDestinationEligible({ activeListings: 0 }, defaults)).toBe(false);
    expect(isDestinationEligible({ activeListings: 0, eligibleChildren: 1 }, defaults)).toBe(true);

    const strict = readDestinationSettings({
      DESTINATION_MIN_ACTIVE_LISTINGS: "2",
      DESTINATION_PARENT_FROM_ANY_CHILD: "false",
    });
    expect(isDestinationEligible({ activeListings: 1 }, strict)).toBe(false);
    expect(isDestinationEligible({ activeListings: 2 }, strict)).toBe(true);
    expect(isDestinationEligible({ activeListings: 0, eligibleChildren: 5 }, strict)).toBe(false);
    expect(isDestinationEligible({ activeListings: 5, directListings: 1, eligibleChildren: 3 }, strict)).toBe(false);
    expect(isDestinationEligible({ activeListings: 5, directListings: 2 }, strict)).toBe(true);
    expect(isDestinationEligible({ activeListings: 5, directListings: 0, eligibleChildren: 3 }, defaults)).toBe(true);
  });
});
