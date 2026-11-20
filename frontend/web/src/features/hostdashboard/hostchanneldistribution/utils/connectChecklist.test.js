import { describeConnectChecklist } from "./connectChecklist";

const DISCONNECT_LINE = "I will disconnect only with the switch on this page";

describe("describeConnectChecklist", () => {
  test.each([
    ["BookingCom", "Booking.com extranet"],
    ["Airbnb", "owner of the Airbnb account"],
    ["Vrbo", "not linked to another property management system"],
  ])("%s has its own prerequisite first and the disconnect line last", (otaCode, expectedPart) => {
    const lines = describeConnectChecklist(otaCode);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain(expectedPart);
    expect(lines.at(-1)).toBe(DISCONNECT_LINE);
  });

  test("Booking.com names the Channex connectivity provider choice and the issue number", () => {
    expect(describeConnectChecklist("BookingCom")[0]).toMatch(/Channex.*connectivity provider.*#3950/);
  });

  test("an unknown OTA still gets the disconnect line, so it is never skipped", () => {
    expect(describeConnectChecklist("Expedia")).toEqual([DISCONNECT_LINE]);
  });
});
