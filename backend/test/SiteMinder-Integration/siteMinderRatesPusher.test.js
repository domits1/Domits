import { describe, expect, jest, test } from "@jest/globals";
import { SiteMinderRatesPusher } from "../../functions/SiteMinder-Integration/business/siteMinderRatesPusher.js";

const soapClient = () => ({ pmsCode: "PMSXTEST", send: jest.fn(async (_body, { echoToken }) => ({ success: true, echoToken })) });

describe("SiteMinderRatesPusher", () => {
  test("builds the rates message for the hotel and sends it with the same echo token", async () => {
    const client = soapClient();
    const pusher = new SiteMinderRatesPusher({ soapClient: client });

    const result = await pusher.push({
      hotelCode: "PMSXTEST1",
      items: [{ roomTypeCode: "DORM", ratePlanCode: "BAR1", start: "2026-12-01", end: "2026-12-03", amount: 150, currency: "EUR" }],
    });

    const [body, { echoToken }] = client.send.mock.calls[0];
    expect(body).toContain('<RequestorID Type="22" ID="PMSXTEST"/>');
    expect(body).toContain('AmountAfterTax="150.00"');
    expect(body).toContain(`EchoToken="${echoToken}"`);
    expect(result).toEqual({ success: true, echoToken });
  });

  test("does not call SiteMinder when the items are invalid", async () => {
    const client = soapClient();
    const pusher = new SiteMinderRatesPusher({ soapClient: client });

    await expect(pusher.push({ hotelCode: "PMSXTEST1", items: [] })).rejects.toThrow("at least one rate item");
    expect(client.send).not.toHaveBeenCalled();
  });
});
