import { describe, expect, test } from "@jest/globals";
import {
  buildReservationsRead,
  readReservations,
} from "../../functions/SiteMinder-Integration/util/reservationsMessage.js";

const envelope = (body) =>
  `<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Header/><SOAP-ENV:Body>` +
  `<OTA_ResRetrieveRS xmlns="http://www.opentravel.org/OTA/2003/05" Version="1.0" TimeStamp="2026-11-04T10:00:00+00:00" EchoToken="e1">` +
  `${body}</OTA_ResRetrieveRS></SOAP-ENV:Body></SOAP-ENV:Envelope>`;

const POS =
  `<POS><Source><RequestorID Type="22" ID="SITEMINDER"/>` +
  `<BookingChannel Primary="true" Type="7"><CompanyName Code="EXP">Expedia</CompanyName></BookingChannel></Source>` +
  `<Source><BookingChannel Primary="false" Type="7"><CompanyName Code="EXPA">Expedia Affiliate</CompanyName></BookingChannel></Source></POS>`;

const roomStay = ({
  roomTypeCode = "DR",
  ratePlanCode = "RAC1",
  start = "2027-03-12",
  end = "2027-03-15",
  guestRph = "1",
} = {}) =>
  `<RoomStay>` +
  (roomTypeCode ? `<RoomTypes><RoomType RoomTypeCode="${roomTypeCode}"/></RoomTypes>` : "") +
  (ratePlanCode
    ? `<RatePlans><RatePlan RatePlanCode="${ratePlanCode}" EffectiveDate="${start}" ExpireDate="${end}"/></RatePlans>`
    : "") +
  `<GuestCounts><GuestCount AgeQualifyingCode="10" Count="2"/><GuestCount AgeQualifyingCode="8" Count="1"/>` +
  `<GuestCount AgeQualifyingCode="7" Count="1"/></GuestCounts>` +
  `<TimeSpan Start="${start}" End="${end}"/>` +
  `<Total AmountBeforeTax="510.00" AmountAfterTax="568.25" CurrencyCode="EUR"/>` +
  `<BasicPropertyInfo HotelCode="PMSXTEST1"/>` +
  `<ResGuestRPHs><ResGuestRPH RPH="${guestRph}"/></ResGuestRPHs>` +
  `</RoomStay>`;

const RES_GUESTS =
  `<ResGuests><ResGuest ResGuestRPH="1" PrimaryIndicator="true"><Profiles><ProfileInfo><Profile ProfileType="1"><Customer>` +
  `<PersonName><NamePrefix>Mr</NamePrefix><GivenName>James</GivenName><Surname>Bond</Surname></PersonName>` +
  `<Telephone PhoneNumber="555-1234"/><Telephone PhoneNumber="555-4321" PhoneUseType="4"/>` +
  `<Email>james.bond@example.com</Email></Customer></Profile></ProfileInfo></Profiles></ResGuest></ResGuests>`;

const RES_GLOBAL_INFO =
  `<ResGlobalInfo><Guarantee><GuaranteesAccepted><GuaranteeAccepted>` +
  `<PaymentCard CardCode="VI" CardType="1" CardNumber="4111111111111111" ExpireDate="1129"><CardHolderName>James Bond</CardHolderName></PaymentCard>` +
  `</GuaranteeAccepted></GuaranteesAccepted></Guarantee>` +
  `<Total AmountBeforeTax="520.00" AmountAfterTax="583.25" CurrencyCode="EUR"/>` +
  `<HotelReservationIDs><HotelReservationID ResID_Type="14" ResID_Value="PNR-1"/></HotelReservationIDs>` +
  `<BasicPropertyInfo HotelCode="PMSXTEST1"/></ResGlobalInfo>`;

const hotelReservation = ({
  attributes = `CreateDateTime="2026-11-04T09:55:00+00:00" ResStatus="Book"`,
  id = "SM-1",
  messageId = "msg-1",
  rooms = [roomStay()],
} = {}) =>
  `<HotelReservation ${attributes}>${POS}` +
  `<UniqueID Type="14" ID="${id}"/><UniqueID Type="16" ID="${messageId}" ID_Context="MESSAGE_UNIQUE_ID"/>` +
  `<RoomStays>${rooms.join("")}</RoomStays>${RES_GUESTS}${RES_GLOBAL_INFO}</HotelReservation>`;

const withReservations = (...reservations) =>
  envelope(`<Success/><ReservationsList>${reservations.join("")}</ReservationsList>`);

describe("readReservations", () => {
  test("reads a new reservation with its ids, channel, rooms, primary guest and total", () => {
    const [reservation] = readReservations(withReservations(hotelReservation()));

    expect(reservation).toEqual({
      status: "Book",
      siteMinderId: "SM-1",
      messageId: "msg-1",
      createdAt: "2026-11-04T09:55:00+00:00",
      lastModifiedAt: null,
      hotelCode: "PMSXTEST1",
      channel: { code: "EXP", name: "Expedia" },
      rooms: [
        {
          roomTypeCode: "DR",
          ratePlanCodes: ["RAC1"],
          arrival: "2027-03-12",
          departure: "2027-03-15",
          adults: 2,
          children: 1,
          infants: 1,
          total: { amountBeforeTax: 510, amountAfterTax: 568.25, currency: "EUR" },
        },
      ],
      guest: { firstName: "James", lastName: "Bond", email: "james.bond@example.com", phone: "555-1234" },
      total: { amountBeforeTax: 520, amountAfterTax: 583.25, currency: "EUR" },
    });
  });

  test("never reads the payment card", () => {
    const text = JSON.stringify(readReservations(withReservations(hotelReservation())));

    expect(text).not.toContain("4111111111111111");
    expect(text).not.toContain("1129");
  });

  test("reads a modification and a cancellation with their last modify time", () => {
    const reservations = readReservations(
      withReservations(
        hotelReservation({
          attributes: `LastModifyDateTime="2026-11-04T09:58:00+00:00" ResStatus="Modify"`,
          messageId: "msg-2",
        }),
        hotelReservation({
          attributes: `LastModifyDateTime="2026-11-04T09:59:00+00:00" ResStatus="Cancel"`,
          messageId: "msg-3",
        })
      )
    );

    expect(
      reservations.map(({ status, messageId, createdAt, lastModifiedAt }) => ({
        status,
        messageId,
        createdAt,
        lastModifiedAt,
      }))
    ).toEqual([
      { status: "Modify", messageId: "msg-2", createdAt: null, lastModifiedAt: "2026-11-04T09:58:00+00:00" },
      { status: "Cancel", messageId: "msg-3", createdAt: null, lastModifiedAt: "2026-11-04T09:59:00+00:00" },
    ]);
  });

  test("reads every room of a multi-room reservation", () => {
    const [reservation] = readReservations(
      withReservations(hotelReservation({ rooms: [roomStay(), roomStay({ roomTypeCode: "TW", ratePlanCode: "BAR" })] }))
    );

    expect(reservation.rooms.map((room) => [room.roomTypeCode, room.ratePlanCodes])).toEqual([
      ["DR", ["RAC1"]],
      ["TW", ["BAR"]],
    ]);
  });

  test("leaves the room type and rate plan empty when SiteMinder has no mapping for them", () => {
    const [reservation] = readReservations(
      withReservations(hotelReservation({ rooms: [roomStay({ roomTypeCode: null, ratePlanCode: null })] }))
    );

    expect(reservation.rooms[0]).toMatchObject({ roomTypeCode: null, ratePlanCodes: [], arrival: "2027-03-12" });
  });

  test("reads every rate plan of a stay that changes rate plan halfway", () => {
    const stay = roomStay().replace(
      `<RatePlans><RatePlan RatePlanCode="RAC1" EffectiveDate="2027-03-12" ExpireDate="2027-03-15"/></RatePlans>`,
      `<RatePlans><RatePlan RatePlanCode="RAC1" EffectiveDate="2027-03-12" ExpireDate="2027-03-14"/>` +
        `<RatePlan RatePlanCode="RAC2" EffectiveDate="2027-03-14" ExpireDate="2027-03-15"/></RatePlans>`
    );

    const [reservation] = readReservations(withReservations(hotelReservation({ rooms: [stay] })));

    expect(reservation.rooms[0].ratePlanCodes).toEqual(["RAC1", "RAC2"]);
  });

  test("returns an empty list when there are no reservations", () => {
    expect(readReservations(envelope("<Success/>"))).toEqual([]);
  });

  test("refuses a response with a document type declaration", () => {
    const xml = `<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "aaaa">]>${withReservations(hotelReservation())}`;

    expect(() => readReservations(xml)).toThrow("SiteMinder reservations response must not contain a DOCTYPE");
  });

  test("refuses a reservation without a SiteMinder id or message id, because it cannot be saved or confirmed", () => {
    const xml = withReservations(hotelReservation({ id: "", messageId: "" }));

    expect(() => readReservations(xml)).toThrow("SiteMinder reservation is missing its id or message id");
  });
});

const NOW = new Date("2026-11-09T10:00:00.000Z");

describe("buildReservationsRead", () => {
  test("asks SiteMinder for every undelivered reservation of the PMS", () => {
    const xml = buildReservationsRead({ requestorId: "PMSXTEST", echoToken: "e1", now: NOW });

    expect(xml).toBe(
      '<OTA_ReadRQ xmlns="http://www.opentravel.org/OTA/2003/05" Version="1.0" TimeStamp="2026-11-09T10:00:00.000Z" EchoToken="e1">' +
        '<POS><Source><RequestorID Type="22" ID="PMSXTEST"/></Source></POS>' +
        '<ReadRequests><HotelReadRequest><SelectionCriteria SelectionType="Undelivered"/></HotelReadRequest></ReadRequests>' +
        "</OTA_ReadRQ>"
    );
  });

  test("escapes the requestor id", () => {
    expect(buildReservationsRead({ requestorId: 'A"&B', echoToken: "e1", now: NOW })).toContain('ID="A&quot;&amp;B"');
  });

  test("refuses to build without a requestor id", () => {
    expect(() => buildReservationsRead({ requestorId: "", echoToken: "e1", now: NOW })).toThrow("requestorId is required");
  });
});
