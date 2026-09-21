import { describe, expect, it, jest } from "@jest/globals";
import sendBookingRequestEmails from "../../functions/General-Bookings-CRUD-Bookings-develop/business/sendBookingRequestEmails.js";

const BOOKING_INFO = {
  publicBookingRef: "DBW-ABCDEFGHJK",
  propertyName: "Sea View Loft",
  guestName: "Guest Name",
  guestEmail: "guest@example.com",
  guests: 2,
  checkIn: "2026-10-01",
  checkOut: "2026-10-05",
};

const sentPayloads = (lambdaClient) =>
  lambdaClient.send.mock.calls.map(([command]) => JSON.parse(command.input.Payload).body);

const buildLambdaClient = () => ({ send: jest.fn().mockResolvedValue({}) });

describe("sendBookingRequestEmails", () => {
  it("sends the guest a request confirmation that makes clear the stay is not booked yet", async () => {
    const lambdaClient = buildLambdaClient();

    await sendBookingRequestEmails(
      { hostEmail: "host@example.com", guestEmail: "guest@example.com", bookingInfo: BOOKING_INFO },
      { lambdaClient }
    );

    const [guestEmail] = sentPayloads(lambdaClient);
    expect(guestEmail.toEmail).toBe("guest@example.com");
    expect(guestEmail.subject).toBe("Booking Request Received");
    expect(guestEmail.body).toContain("DBW-ABCDEFGHJK");
    expect(guestEmail.body).toContain('"Sea View Loft"');
    expect(guestEmail.body).toContain("Number of guests: 2");
    expect(guestEmail.body).toContain("Arrival date: 2026-10-01");
    expect(guestEmail.body).toContain("Departure date: 2026-10-05");
    expect(guestEmail.body).toContain("not booked yet");
    expect(guestEmail.body).not.toMatch(/confirmed!/);
  });

  it("tells the host who asked, for which dates, and where to accept or decline", async () => {
    const lambdaClient = buildLambdaClient();

    await sendBookingRequestEmails(
      { hostEmail: "host@example.com", guestEmail: "guest@example.com", bookingInfo: BOOKING_INFO },
      { lambdaClient }
    );

    const [, hostEmail] = sentPayloads(lambdaClient);
    expect(hostEmail.toEmail).toBe("host@example.com");
    expect(hostEmail.subject).toBe("New Booking Request");
    expect(hostEmail.body).toContain("direct booking website");
    expect(hostEmail.body).toContain("Guest Name (guest@example.com)");
    expect(hostEmail.body).toContain("Number of guests: 2");
    expect(hostEmail.body).toContain("Arrival date: 2026-10-01");
    expect(hostEmail.body).toContain("Departure date: 2026-10-05");
    expect(hostEmail.body).toContain("accept or decline");
  });

  it("carries no placeholder wording", async () => {
    const lambdaClient = buildLambdaClient();

    await sendBookingRequestEmails(
      { hostEmail: "host@example.com", guestEmail: "guest@example.com", bookingInfo: BOOKING_INFO },
      { lambdaClient }
    );

    for (const payload of sentPayloads(lambdaClient)) {
      expect(`${payload.subject}\n${payload.body}`).not.toMatch(/placeholder/i);
    }
  });

  it("skips the host email when the host address is unknown", async () => {
    const lambdaClient = buildLambdaClient();

    await sendBookingRequestEmails({ hostEmail: null, guestEmail: "guest@example.com", bookingInfo: BOOKING_INFO }, { lambdaClient });

    expect(sentPayloads(lambdaClient).map((payload) => payload.toEmail)).toEqual(["guest@example.com"]);
  });

  it("lets a failed send surface to the caller", async () => {
    const lambdaClient = { send: jest.fn().mockRejectedValue(new Error("mail down")) };

    await expect(
      sendBookingRequestEmails(
        { hostEmail: "host@example.com", guestEmail: "guest@example.com", bookingInfo: BOOKING_INFO },
        { lambdaClient }
      )
    ).rejects.toThrow("mail down");
  });
});
