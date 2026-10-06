import { buildCheckInInstructions } from "./checkInInstructions";

describe("buildCheckInInstructions", () => {
  test("shows the range when both from and till exist", () => {
    expect(buildCheckInInstructions({ from: "15:00", till: "18:00" })).toEqual(["Check-in: 15:00–18:00"]);
  });

  test("shows only the start when till is missing, never 'undefined'", () => {
    const instructions = buildCheckInInstructions({ from: "15:00" });

    expect(instructions).toEqual(["Check-in from 15:00"]);
    expect(instructions.join(" ")).not.toContain("undefined");
  });

  test.each([null, "", undefined])("treats a till of %j as missing", (till) => {
    expect(buildCheckInInstructions({ from: "15:00", till })).toEqual(["Check-in from 15:00"]);
  });

  test.each([
    ["only till is set", { till: "18:00" }],
    ["the window is empty", {}],
    ["the window is missing", undefined],
    ["the window is null", null],
  ])("shows no check-in line when %s", (_label, checkInWindow) => {
    expect(buildCheckInInstructions(checkInWindow)).toEqual([]);
  });
});
