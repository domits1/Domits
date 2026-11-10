import { describe, expect, jest, test } from "@jest/globals";
import { SiteMinderAvailabilityPusher } from "../../functions/SiteMinder-Integration/business/siteMinderAvailabilityPusher.js";

const soapClient = () => ({ pmsCode: "PMSXTEST", send: jest.fn(async (_body, { echoToken }) => ({ success: true, echoToken })) });

describe("SiteMinderAvailabilityPusher", () => {
  test("builds the availability message for the hotel and sends it with the same echo token", async () => {
    const client = soapClient();
    const pusher = new SiteMinderAvailabilityPusher({ soapClient: client });

    const result = await pusher.push({
      hotelCode: "PMSXTEST1",
      items: [{ roomTypeCode: "DORM", start: "2026-12-01", end: "2026-12-03", bookingLimit: 3 }],
      now: new Date("2026-10-26T10:00:00.000Z"),
    });

    const [body, { echoToken }] = client.send.mock.calls[0];
    expect(body).toContain('<RequestorID Type="22" ID="PMSXTEST"/>');
    expect(body).toContain('<AvailStatusMessages HotelCode="PMSXTEST1">');
    expect(body).toContain('<AvailStatusMessage BookingLimit="3"><StatusApplicationControl Start="2026-12-01" End="2026-12-03" InvTypeCode="DORM"/></AvailStatusMessage>');
    expect(body).toContain(`EchoToken="${echoToken}"`);
    expect(echoToken).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(result).toEqual({ success: true, echoToken });
  });

  test("uses a new echo token for every push", async () => {
    const client = soapClient();
    const pusher = new SiteMinderAvailabilityPusher({ soapClient: client });
    const items = [{ roomTypeCode: "DORM", start: "2026-12-01", end: "2026-12-01", bookingLimit: 1 }];

    await pusher.push({ hotelCode: "PMSXTEST1", items });
    await pusher.push({ hotelCode: "PMSXTEST1", items });

    expect(client.send.mock.calls[0][1].echoToken).not.toBe(client.send.mock.calls[1][1].echoToken);
  });

  test("does not call SiteMinder when the items are invalid", async () => {
    const client = soapClient();
    const pusher = new SiteMinderAvailabilityPusher({ soapClient: client });

    await expect(pusher.push({ hotelCode: "PMSXTEST1", items: [] })).rejects.toThrow("at least one availability item");
    expect(client.send).not.toHaveBeenCalled();
  });
});
