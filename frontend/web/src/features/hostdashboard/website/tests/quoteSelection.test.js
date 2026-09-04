import {
  EMPTY_STAY_RANGE,
  buildStayNightKeys,
  countStayNights,
  formatMinorUnits,
  hasBlockedNight,
  selectStayDate,
  toLocalDateKey,
} from "../rendering/booking/quoteSelection";

const TODAY = "2026-10-01";
const blocked = (...keys) => new Set(keys);

describe("buildStayNightKeys / countStayNights", () => {
  it("lists every stayed night, checkout-exclusive", () => {
    expect(buildStayNightKeys("2026-10-01", "2026-10-04")).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(countStayNights("2026-10-01", "2026-10-04")).toBe(3);
  });

  it("crosses month and year boundaries without timezone drift", () => {
    expect(buildStayNightKeys("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01"]);
  });

  it("returns nothing for an incomplete or inverted range", () => {
    expect(buildStayNightKeys(null, "2026-10-04")).toEqual([]);
    expect(buildStayNightKeys("2026-10-04", "2026-10-01")).toEqual([]);
    expect(countStayNights("2026-10-04", "2026-10-04")).toBe(0);
  });
});

describe("hasBlockedNight", () => {
  it("ignores a block on the checkout day itself", () => {
    expect(hasBlockedNight("2026-10-01", "2026-10-04", blocked("2026-10-04"))).toBe(false);
    expect(hasBlockedNight("2026-10-01", "2026-10-04", blocked("2026-10-02"))).toBe(true);
  });
});

describe("selectStayDate", () => {
  const select = (range, dateKey, blockedKeys = blocked()) =>
    selectStayDate({ range, dateKey, blockedDateKeys: blockedKeys, todayKey: TODAY });

  it("starts a range on the first click", () => {
    expect(select(EMPTY_STAY_RANGE, "2026-10-10")).toEqual({ checkIn: "2026-10-10", checkOut: null });
  });

  it("completes the range on a later click", () => {
    expect(select({ checkIn: "2026-10-10", checkOut: null }, "2026-10-14")).toEqual({
      checkIn: "2026-10-10",
      checkOut: "2026-10-14",
    });
  });

  it("restarts the range when clicking on or before the check-in", () => {
    expect(select({ checkIn: "2026-10-10", checkOut: null }, "2026-10-10")).toEqual({
      checkIn: "2026-10-10",
      checkOut: null,
    });
    expect(select({ checkIn: "2026-10-10", checkOut: null }, "2026-10-08")).toEqual({
      checkIn: "2026-10-08",
      checkOut: null,
    });
  });

  it("starts over once a range is complete", () => {
    expect(select({ checkIn: "2026-10-10", checkOut: "2026-10-14" }, "2026-10-20")).toEqual({
      checkIn: "2026-10-20",
      checkOut: null,
    });
  });

  it("ignores past dates entirely", () => {
    expect(select(EMPTY_STAY_RANGE, "2026-09-30")).toBe(EMPTY_STAY_RANGE);
  });

  it("refuses to start a stay on a blocked night", () => {
    const range = EMPTY_STAY_RANGE;
    expect(select(range, "2026-10-10", blocked("2026-10-10"))).toBe(range);
  });

  it("allows a blocked day as the checkout when the nights before it are free", () => {
    expect(select({ checkIn: "2026-10-10", checkOut: null }, "2026-10-12", blocked("2026-10-12"))).toEqual({
      checkIn: "2026-10-10",
      checkOut: "2026-10-12",
    });
  });

  it("restarts at the clicked date when a blocked night sits inside the attempted range", () => {
    expect(select({ checkIn: "2026-10-10", checkOut: null }, "2026-10-14", blocked("2026-10-12"))).toEqual({
      checkIn: "2026-10-14",
      checkOut: null,
    });
  });

  it("keeps the range unchanged when a blocked night sits inside and the clicked date is itself blocked", () => {
    const range = { checkIn: "2026-10-10", checkOut: null };
    expect(select(range, "2026-10-14", blocked("2026-10-12", "2026-10-14"))).toBe(range);
  });
});

describe("formatMinorUnits / toLocalDateKey", () => {
  it("formats cents as a currency string", () => {
    expect(formatMinorUnits(81000)).toBe("€810.00");
    expect(formatMinorUnits(1)).toBe("€0.01");
  });

  it("falls back to an empty string for non-numeric input", () => {
    expect(formatMinorUnits(null)).toBe("");
    expect(formatMinorUnits("abc")).toBe("");
  });

  it("builds local date keys with zero padding", () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
