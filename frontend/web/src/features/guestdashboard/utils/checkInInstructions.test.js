import { buildCheckInInstructions } from "./checkInInstructions";

describe("buildCheckInInstructions", () => {
  test("shows the range when both from and till exist", () => {
    expect(buildCheckInInstructions({ from: "15:00", till: "18:00" })).toEqual(["Check-in: 15:00–18:00"]);
  });

  describe("seconds", () => {
    test("strips seconds from both ends of the range", () => {
      expect(buildCheckInInstructions({ from: "15:00:00", till: "18:30:00" })).toEqual(["Check-in: 15:00–18:30"]);
    });

    test("strips seconds when only from exists", () => {
      expect(buildCheckInInstructions({ from: "15:00:00" })).toEqual(["Check-in from 15:00"]);
    });

    test("strips fractional seconds too", () => {
      expect(buildCheckInInstructions({ from: "15:00:00.000", till: "18:00:00.000" })).toEqual([
        "Check-in: 15:00–18:00",
      ]);
    });

    test("leaves values that are not HH:MM:SS untouched", () => {
      expect(buildCheckInInstructions({ from: "3 PM", till: "6 PM" })).toEqual(["Check-in: 3 PM–6 PM"]);
    });
  });

  describe("same time", () => {
    test("shows a single time when from and till are the same after stripping seconds", () => {
      expect(buildCheckInInstructions({ from: "15:00:00", till: "15:00:00" })).toEqual(["Check-in: 15:00"]);
    });

    test("treats times that differ only in seconds as the same time", () => {
      expect(buildCheckInInstructions({ from: "15:00:00", till: "15:00:30" })).toEqual(["Check-in: 15:00"]);
    });

    test("still shows a range when the times really differ", () => {
      expect(buildCheckInInstructions({ from: "15:00:00", till: "15:01:00" })).toEqual(["Check-in: 15:00–15:01"]);
    });
  });

  describe("from only", () => {
    test("shows only the start when till is missing, never 'undefined'", () => {
      const instructions = buildCheckInInstructions({ from: "15:00" });

      expect(instructions).toEqual(["Check-in from 15:00"]);
      expect(instructions.join(" ")).not.toContain("undefined");
    });

    test.each([null, "", undefined])("treats a till of %j as missing", (till) => {
      expect(buildCheckInInstructions({ from: "15:00", till })).toEqual(["Check-in from 15:00"]);
    });
  });

  describe("nothing", () => {
    test.each([
      ["only till is set", { till: "18:00" }],
      ["the window is empty", {}],
      ["the window is missing", undefined],
      ["the window is null", null],
    ])("shows no check-in line when %s", (_label, checkInWindow) => {
      expect(buildCheckInInstructions(checkInWindow)).toEqual([]);
    });
  });
});
