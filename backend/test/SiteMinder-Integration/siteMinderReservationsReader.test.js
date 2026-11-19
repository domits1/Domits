import { describe, expect, jest, test } from "@jest/globals";
import { SiteMinderReservationsReader } from "../../functions/SiteMinder-Integration/business/siteMinderReservationsReader.js";

const NOW = new Date("2026-11-09T10:00:00.000Z");

const RETRIEVED =
  '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Body>' +
  '<OTA_ResRetrieveRS xmlns="http://www.opentravel.org/OTA/2003/05" Version="1.0"><Success/><ReservationsList>' +
  '<HotelReservation CreateDateTime="2026-11-09T09:55:00+00:00" ResStatus="Book">' +
  '<UniqueID Type="14" ID="SM-1"/><UniqueID Type="16" ID="msg-1" ID_Context="MESSAGE_UNIQUE_ID"/>' +
  '<RoomStays><RoomStay><TimeSpan Start="2027-03-12" End="2027-03-15"/><BasicPropertyInfo HotelCode="PMSXTEST1"/></RoomStay></RoomStays>' +
  "</HotelReservation></ReservationsList></OTA_ResRetrieveRS></SOAP-ENV:Body></SOAP-ENV:Envelope>";

const soapClient = (xml = RETRIEVED) => ({
  pmsCode: "PMSXTEST",
  send: jest.fn(async (_body, { echoToken }) => ({ success: true, echoToken, xml })),
});

describe("SiteMinderReservationsReader", () => {
  test("asks for the undelivered reservations of the PMS and reads them", async () => {
    const client = soapClient();

    const reservations = await new SiteMinderReservationsReader({ soapClient: client }).readUndelivered({ now: NOW });

    const [body, { echoToken }] = client.send.mock.calls[0];
    expect(body).toContain('<RequestorID Type="22" ID="PMSXTEST"/>');
    expect(body).toContain('<SelectionCriteria SelectionType="Undelivered"/>');
    expect(body).toContain(`EchoToken="${echoToken}"`);
    expect(reservations).toHaveLength(1);
    expect(reservations[0]).toMatchObject({
      status: "Book",
      siteMinderId: "SM-1",
      messageId: "msg-1",
      hotelCode: "PMSXTEST1",
    });
  });

  test("confirms the saved reservations in one message", async () => {
    const client = soapClient();
    const reader = new SiteMinderReservationsReader({ soapClient: client });

    await reader.confirm(
      [
        { status: "Book", messageId: "msg-1", bookingId: "booking-1", processedAt: "2026-11-09T09:59:00.000Z" },
        { status: "Modify", messageId: "msg-2", bookingId: "booking-2", processedAt: "2026-11-09T09:59:10.000Z" },
      ],
      { now: NOW }
    );

    expect(client.send).toHaveBeenCalledTimes(1);
    const [body] = client.send.mock.calls[0];
    expect(body).toContain("<Success/>");
    expect(body).toContain('ResID_Value="booking-1"');
    expect(body).toContain('ResID_Value="booking-2"');
  });

  test("does not call SiteMinder when there is nothing to confirm", async () => {
    const client = soapClient();

    await new SiteMinderReservationsReader({ soapClient: client }).confirm([], { now: NOW });

    expect(client.send).not.toHaveBeenCalled();
  });

  test("reports a failed reservation in its own message", async () => {
    const client = soapClient();

    await new SiteMinderReservationsReader({ soapClient: client }).reportFailure(
      { status: "Book", messageId: "msg-3", processedAt: "2026-11-09T09:59:00.000Z" },
      { type: 3, code: 402, message: "Room type is not mapped" },
      { now: NOW }
    );

    const [body] = client.send.mock.calls[0];
    expect(body).toContain('<Error Type="3" Code="402">Room type is not mapped</Error>');
    expect(body).toContain('<UniqueID Type="16" ID="msg-3"/>');
    expect(body).not.toContain("<Success/>");
  });

  test("uses a new echo token for every message", async () => {
    const client = soapClient();
    const reader = new SiteMinderReservationsReader({ soapClient: client });

    await reader.readUndelivered({ now: NOW });
    await reader.readUndelivered({ now: NOW });

    expect(client.send.mock.calls[0][1].echoToken).not.toBe(client.send.mock.calls[1][1].echoToken);
  });
});
