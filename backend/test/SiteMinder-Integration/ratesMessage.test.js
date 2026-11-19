import { describe, expect, test } from "@jest/globals";
import { buildRatesNotif } from "../../functions/SiteMinder-Integration/util/ratesMessage.js";

const NOW = new Date("2026-10-26T10:00:00.000Z");
const base = { roomTypeCode: "DORM", ratePlanCode: "BAR1", start: "2026-12-01", end: "2026-12-03", amount: 150, currency: "EUR" };
const build = (items) => buildRatesNotif({ hotelCode: "PMSXTEST1", requestorId: "PMSXTEST", items, echoToken: "e1", now: NOW });

describe("buildRatesNotif", () => {
  test("wraps the messages in an OTA_HotelRateAmountNotifRQ for the hotel", () => {
    const xml = build([base]);

    expect(xml).toMatch(/^<OTA_HotelRateAmountNotifRQ xmlns="http:\/\/www\.opentravel\.org\/OTA\/2003\/05" Version="1\.0" TimeStamp="2026-10-26T10:00:00\.000Z" EchoToken="e1">/);
    expect(xml).toContain('<POS><Source><RequestorID Type="22" ID="PMSXTEST"/></Source></POS>');
    expect(xml).toContain('<RateAmountMessages HotelCode="PMSXTEST1">');
    expect(xml).not.toContain("\n");
  });

  test("sends one nightly price before tax per room rate and date range, with the currency", () => {
    expect(build([base])).toContain(
      '<RateAmountMessage><StatusApplicationControl InvTypeCode="DORM" RatePlanCode="BAR1"/><Rates>' +
        '<Rate CurrencyCode="EUR" Start="2026-12-01" End="2026-12-03"><BaseByGuestAmts><BaseByGuestAmt AmountBeforeTax="150.00"/></BaseByGuestAmts></Rate>' +
        "</Rates></RateAmountMessage>"
    );
  });

  test("rounds the amount to 2 decimals", () => {
    expect(build([{ ...base, amount: 99.999 }])).toContain('AmountBeforeTax="100.00"');
    expect(build([{ ...base, amount: 120.5 }])).toContain('AmountBeforeTax="120.50"');
  });

  test("puts several date ranges of the same room rate in one message", () => {
    const xml = build([base, { ...base, start: "2026-12-04", end: "2026-12-05", amount: 200 }]);

    expect(xml.match(/<RateAmountMessage>/g)).toHaveLength(1);
    expect(xml.match(/<Rate /g)).toHaveLength(2);
  });

  test("gives every room rate its own message", () => {
    const xml = build([base, { ...base, ratePlanCode: "NonRef1", amount: 120 }]);

    expect(xml.match(/<RateAmountMessage>/g)).toHaveLength(2);
    expect(xml).toContain('RatePlanCode="NonRef1"');
  });

  test("escapes the codes", () => {
    expect(build([{ ...base, ratePlanCode: 'A&"B' }])).toContain('RatePlanCode="A&amp;&quot;B"');
  });

  test.each([
    ["no hotelCode", () => buildRatesNotif({ requestorId: "X", items: [base] }), "hotelCode is required"],
    ["no items", () => build([]), "at least one rate item"],
    ["no ratePlanCode", () => build([{ ...base, ratePlanCode: "" }]), "ratePlanCode is required"],
    ["a bad date", () => build([{ ...base, end: "2026-12" }]), "yyyy-mm-dd"],
    ["start after end", () => build([{ ...base, start: "2026-12-09" }]), "start is after end"],
    ["an amount of 0", () => build([{ ...base, amount: 0 }]), "amount must be a number above 0"],
    ["a string amount", () => build([{ ...base, amount: "150" }]), "amount must be a number above 0"],
    ["no currency", () => build([{ ...base, currency: undefined }]), "currency must be a 3-letter code"],
    ["a lowercase currency", () => build([{ ...base, currency: "eur" }]), "currency must be a 3-letter code"],
    ["overlapping dates for the same room rate", () => build([base, { ...base, start: "2026-12-03", end: "2026-12-04" }]), "overlapping dates"],
  ])("refuses %s", (_label, call, message) => {
    expect(call).toThrow(message);
  });
});
