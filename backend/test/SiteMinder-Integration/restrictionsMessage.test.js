import { describe, expect, test } from "@jest/globals";
import { buildRestrictionsNotif } from "../../functions/SiteMinder-Integration/util/restrictionsMessage.js";

const NOW = new Date("2026-10-26T10:00:00.000Z");
const base = { roomTypeCode: "DORM", ratePlanCode: "BAR1", start: "2026-12-01", end: "2026-12-03" };
const build = (items) => buildRestrictionsNotif({ hotelCode: "PMSXTEST1", requestorId: "PMSXTEST", items, echoToken: "e1", now: NOW });
const CONTROL = '<StatusApplicationControl Start="2026-12-01" End="2026-12-03" InvTypeCode="DORM" RatePlanCode="BAR1"/>';

describe("buildRestrictionsNotif", () => {
  test("wraps the messages in an OTA_HotelAvailNotifRQ for the hotel", () => {
    const xml = build([{ ...base, stopSell: true }]);

    expect(xml).toMatch(/^<OTA_HotelAvailNotifRQ xmlns="http:\/\/www\.opentravel\.org\/OTA\/2003\/05" Version="1\.0" TimeStamp="2026-10-26T10:00:00\.000Z" EchoToken="e1">/);
    expect(xml).toContain('<POS><Source><RequestorID Type="22" ID="PMSXTEST"/></Source></POS>');
    expect(xml).toContain('<AvailStatusMessages HotelCode="PMSXTEST1">');
    expect(xml).not.toContain("\n");
  });

  test("closes and opens a room rate with stop sell", () => {
    expect(build([{ ...base, stopSell: true }])).toContain(`<AvailStatusMessage>${CONTROL}<RestrictionStatus Status="Close"/></AvailStatusMessage>`);
    expect(build([{ ...base, stopSell: false }])).toContain(`<AvailStatusMessage>${CONTROL}<RestrictionStatus Status="Open"/></AvailStatusMessage>`);
  });

  test("sends CTA and CTD each in their own message", () => {
    const xml = build([{ ...base, closedToArrival: true, closedToDeparture: false }]);

    expect(xml).toContain(`<AvailStatusMessage>${CONTROL}<RestrictionStatus Restriction="Arrival" Status="Close"/></AvailStatusMessage>`);
    expect(xml).toContain(`<AvailStatusMessage>${CONTROL}<RestrictionStatus Restriction="Departure" Status="Open"/></AvailStatusMessage>`);
  });

  test("puts min and max stay together with the stop sell", () => {
    const xml = build([{ ...base, minStay: 2, maxStay: 7, stopSell: false }]);

    expect(xml).toContain(
      `<AvailStatusMessage>${CONTROL}<LengthsOfStay><LengthOfStay MinMaxMessageType="SetMinLOS" Time="2"/><LengthOfStay MinMaxMessageType="SetMaxLOS" Time="7"/></LengthsOfStay><RestrictionStatus Status="Open"/></AvailStatusMessage>`
    );
  });

  test("removes the max stay with 999 when maxStay is null", () => {
    expect(build([{ ...base, maxStay: null }])).toContain('<LengthOfStay MinMaxMessageType="SetMaxLOS" Time="999"/>');
  });

  test("only sends the restrictions that are set", () => {
    const xml = build([{ ...base, minStay: 3 }]);

    expect(xml).toContain(`<AvailStatusMessage>${CONTROL}<LengthsOfStay><LengthOfStay MinMaxMessageType="SetMinLOS" Time="3"/></LengthsOfStay></AvailStatusMessage>`);
    expect(xml).not.toContain("RestrictionStatus");
    expect(xml).not.toContain("SetMaxLOS");
  });

  test("escapes the codes", () => {
    expect(build([{ ...base, ratePlanCode: 'A&"B', stopSell: true }])).toContain('RatePlanCode="A&amp;&quot;B"');
  });

  test.each([
    ["no hotelCode", () => buildRestrictionsNotif({ requestorId: "X", items: [{ ...base, stopSell: true }] }), "hotelCode is required"],
    ["no items", () => build([]), "at least one restriction item"],
    ["no ratePlanCode", () => build([{ ...base, ratePlanCode: undefined, stopSell: true }]), "ratePlanCode is required"],
    ["a bad date", () => build([{ ...base, start: "1-12-2026", stopSell: true }]), "yyyy-mm-dd"],
    ["start after end", () => build([{ ...base, start: "2026-12-05", stopSell: true }]), "start is after end"],
    ["nothing to change", () => build([base]), "at least one restriction"],
    ["a string flag", () => build([{ ...base, stopSell: "yes" }]), "stopSell must be true or false"],
    ["a min stay of 0", () => build([{ ...base, minStay: 0 }]), "minStay must be a whole number"],
    ["a removed min stay", () => build([{ ...base, minStay: null }]), "minStay cannot be removed"],
    ["min stay above max stay", () => build([{ ...base, minStay: 8, maxStay: 7 }]), "minStay is above maxStay"],
    [
      "overlapping dates for the same room rate",
      () => build([{ ...base, stopSell: true }, { ...base, start: "2026-12-03", end: "2026-12-04", stopSell: false }]),
      "overlapping dates",
    ],
  ])("refuses %s", (_label, call, message) => {
    expect(call).toThrow(message);
  });

  test("allows the same dates for another rate plan", () => {
    expect(() => build([{ ...base, stopSell: true }, { ...base, ratePlanCode: "NonRef1", stopSell: true }])).not.toThrow();
  });
});
