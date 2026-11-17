import { describe, expect, jest, test } from "@jest/globals";
import { SiteMinderRestrictionsPusher } from "../../functions/SiteMinder-Integration/business/siteMinderRestrictionsPusher.js";

const soapClient = () => ({ pmsCode: "PMSXTEST", send: jest.fn(async (_body, { echoToken }) => ({ success: true, echoToken })) });

describe("SiteMinderRestrictionsPusher", () => {
  test("builds the restrictions message for the hotel and sends it with the same echo token", async () => {
    const client = soapClient();
    const pusher = new SiteMinderRestrictionsPusher({ soapClient: client });

    const result = await pusher.push({
      hotelCode: "PMSXTEST1",
      items: [{ roomTypeCode: "DORM", ratePlanCode: "BAR1", start: "2026-12-01", end: "2026-12-03", stopSell: true }],
    });

    const [body, { echoToken }] = client.send.mock.calls[0];
    expect(body).toContain('<RequestorID Type="22" ID="PMSXTEST"/>');
    expect(body).toContain('<RestrictionStatus Status="Close"/>');
    expect(body).toContain(`EchoToken="${echoToken}"`);
    expect(result).toEqual({ success: true, echoToken });
  });

  test("does not call SiteMinder when the items are invalid", async () => {
    const client = soapClient();
    const pusher = new SiteMinderRestrictionsPusher({ soapClient: client });

    await expect(pusher.push({ hotelCode: "PMSXTEST1", items: [] })).rejects.toThrow("at least one restriction item");
    expect(client.send).not.toHaveBeenCalled();
  });
});
