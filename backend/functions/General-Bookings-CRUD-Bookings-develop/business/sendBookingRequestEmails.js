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

const buildHostPayload = (hostEmail, bookingInfo) => ({
  body: {
    toEmail: hostEmail,
    subject: "New Booking Request",
    body: `Hello,

You have received a new booking request for your property "${bookingInfo.propertyName}" through your direct booking website.

Details:
- Booking reference: ${bookingInfo.publicBookingRef}
- Guest: ${bookingInfo.guestName} (${bookingInfo.guestEmail})
- Number of guests: ${bookingInfo.guests}
- Arrival date: ${bookingInfo.checkIn}
- Departure date: ${bookingInfo.checkOut}

You can accept or decline this request in your host dashboard.`,
  },
});

const sendBookingRequestEmails = async (
  { hostEmail, guestEmail, bookingInfo },
  { lambdaClient = defaultLambdaClient } = {}
) => {
  const payloads = [];
  if (guestEmail) {
    payloads.push(buildGuestPayload(guestEmail, bookingInfo));
  }
  if (hostEmail) {
    payloads.push(buildHostPayload(hostEmail, bookingInfo));
  }

  for (const payload of payloads) {
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: "EmailNotificationService",
        Payload: JSON.stringify(payload),
      })
    );
  }
};

export default sendBookingRequestEmails;
