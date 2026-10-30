import { resolveChannelLabel } from "./channelLabel";

describe("resolveChannelLabel", () => {
  test.each([
    ["Channex code BookingCom", { platform: "CHANNEX", bookingSource: "BookingCom" }, "Booking.com"],
    ["unknown Channex source, as is", { platform: "CHANNEX", bookingSource: "Airbnb" }, "Airbnb"],
    ["Channex without a source", { platform: "CHANNEX", bookingSource: null }, "Channex"],
    ["Channex with a blank source", { platform: "CHANNEX", bookingSource: "  " }, "Channex"],
    ["lowercase platform", { platform: "channex", bookingSource: "BookingCom" }, "Booking.com"],
    ["WhatsApp", { platform: "WHATSAPP" }, "WhatsApp"],
    ["WhatsApp ignores a booking source", { platform: "WHATSAPP", bookingSource: "BookingCom" }, "WhatsApp"],
    ["Domits", { platform: "DOMITS" }, null],
    ["no platform", {}, null],
  ])("%s", (_label, input, expected) => {
    expect(resolveChannelLabel(input)).toBe(expected);
  });
});
