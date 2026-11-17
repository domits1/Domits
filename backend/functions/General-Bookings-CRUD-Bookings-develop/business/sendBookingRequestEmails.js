import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const defaultLambdaClient = new LambdaClient({ region: "eu-north-1" });

const buildGuestPayload = (guestEmail, bookingInfo) => ({
  body: {
    toEmail: guestEmail,
    subject: "Booking Request Received",
    body: `Hello ${bookingInfo.guestName},

We have received your booking request for "${bookingInfo.propertyName}".

Details:
- Booking reference: ${bookingInfo.publicBookingRef}
- Number of guests: ${bookingInfo.guests}
- Arrival date: ${bookingInfo.checkIn}
- Departure date: ${bookingInfo.checkOut}

Your stay is not booked yet. The host still has to confirm your request.

Thank you for your request!`,
  },
});

const quoteGuestMessage = (message) =>
  message
    .split("\n")
    .map((line) => `> ${line}`.trimEnd())
    .join("\n");

const hostPhoneLine = (hostNote) => (hostNote?.phone ? `\n- Phone: ${hostNote.phone}` : "");

const hostMessageBlock = (hostNote) =>
  hostNote?.message ? `\n\nMessage from the guest:\n${quoteGuestMessage(hostNote.message)}` : "";

const buildHostPayload = (hostEmail, bookingInfo, hostNote) => ({
  body: {
    toEmail: hostEmail,
    subject: "New Booking Request",
    body: `Hello,

You have received a new booking request for your property "${bookingInfo.propertyName}" through your direct booking website.

Details:
- Booking reference: ${bookingInfo.publicBookingRef}
- Guest: ${bookingInfo.guestName} (${bookingInfo.guestEmail})${hostPhoneLine(hostNote)}
- Number of guests: ${bookingInfo.guests}
- Arrival date: ${bookingInfo.checkIn}
- Departure date: ${bookingInfo.checkOut}${hostMessageBlock(hostNote)}

You can accept or decline this request in your host dashboard.`,
  },
});

const sendBookingRequestEmails = async (
  { hostEmail, guestEmail, bookingInfo, hostNote },
  { lambdaClient = defaultLambdaClient } = {}
) => {
  const payloads = [];
  if (guestEmail) {
    payloads.push(buildGuestPayload(guestEmail, bookingInfo));
  }
  if (hostEmail) {
    payloads.push(buildHostPayload(hostEmail, bookingInfo, hostNote));
  }

  let firstFailure = null;
  for (const payload of payloads) {
    try {
      await lambdaClient.send(
        new InvokeCommand({
          FunctionName: "EmailNotificationService",
          Payload: JSON.stringify(payload),
        })
      );
    } catch (error) {
      firstFailure = firstFailure ?? error;
    }
  }
  if (firstFailure) {
    throw firstFailure;
  }
};

export default sendBookingRequestEmails;
