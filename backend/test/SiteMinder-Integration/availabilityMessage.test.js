import { describe, expect, test } from "@jest/globals";
import { buildAvailabilityNotif } from "../../functions/SiteMinder-Integration/util/availabilityMessage.js";

const input = () => ({
  hotelCode: "HOTEL1",
  requestorId: "DOMITS",
  echoToken: "echo-1",
  now: new Date("2026-10-12T08:00:00.000Z"),
  items: [
    { roomTypeCode: "VILLA", start: "2026-11-01", end: "2026-11-14", bookingLimit: 1 },
    { roomTypeCode: "VILLA", start: "2026-11-15", end: "2026-11-20", bookingLimit: 0 },
  ],
});

describe("buildAvailabilityNotif", () => {
  test("builds an OTA_HotelAvailNotifRQ with one AvailStatusMessage per item", () => {
    expect(buildAvailabilityNotif(input())).toBe(
      '<OTA_HotelAvailNotifRQ xmlns="http://www.opentravel.org/OTA/2003/05" Version="1.0" TimeStamp="2026-10-12T08:00:00.000Z" EchoToken="echo-1">' +
        '<POS><Source><RequestorID Type="22" ID="DOMITS"/></Source></POS>' +
        '<AvailStatusMessages HotelCode="HOTEL1">' +
        '<AvailStatusMessage BookingLimit="1"><StatusApplicationControl Start="2026-11-01" End="2026-11-14" InvTypeCode="VILLA"/></AvailStatusMessage>' +
        '<AvailStatusMessage BookingLimit="0"><StatusApplicationControl Start="2026-11-15" End="2026-11-20" InvTypeCode="VILLA"/></AvailStatusMessage>' +
        "</AvailStatusMessages>" +
        "</OTA_HotelAvailNotifRQ>"
    );
  });

  test("escapes codes that contain XML characters", () => {
    const data = input();
    data.hotelCode = 'A&"B';
    expect(buildAvailabilityNotif(data)).toContain('HotelCode="A&amp;&quot;B"');
  });

  test("allows the same dates for different room types", () => {
    const data = input();
    data.items = [
      { roomTypeCode: "VILLA", start: "2026-11-01", end: "2026-11-05", bookingLimit: 1 },
      { roomTypeCode: "CHALET", start: "2026-11-01", end: "2026-11-05", bookingLimit: 1 },
    ];
    expect(() => buildAvailabilityNotif(data)).not.toThrow();
  });

  test("rejects overlapping dates for the same room type", () => {
    const data = input();
    data.items[1].start = "2026-11-14";
    expect(() => buildAvailabilityNotif(data)).toThrow("overlapping dates");
  });

  test.each([
    ["a negative bookingLimit", { bookingLimit: -1 }, "bookingLimit"],
    ["a decimal bookingLimit", { bookingLimit: 1.5 }, "bookingLimit"],
    ["a date in the wrong format", { start: "01-11-2026" }, "yyyy-mm-dd"],
    ["a start after the end", { start: "2026-11-30" }, "start is after end"],
    ["a missing room type", { roomTypeCode: "" }, "roomTypeCode is required"],
  ])("rejects %s", (_label, change, message) => {
    const data = input();
    data.items = [{ ...data.items[0], ...change }];
    expect(() => buildAvailabilityNotif(data)).toThrow(message);
  });

  test.each([
    ["hotelCode", { hotelCode: "" }],
    ["requestorId", { requestorId: "" }],
    ["at least one availability item", { items: [] }],
  ])("requires %s", (message, change) => {
    expect(() => buildAvailabilityNotif({ ...input(), ...change })).toThrow(message);
  });
});