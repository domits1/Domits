
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "eu-north-1" });

const sendEmail = async (userEmail, hostEmail, bookingInfo) => {
    const userEmailPayload = {
        body: {
            toEmail: userEmail,
            subject: "Booking Confirmation",
            body: `Hello,
            Your booking at "${bookingInfo.propertyName}" has been confirmed!

            Details:
            - Number of guests: ${bookingInfo.guests}
            - Arrival date: ${bookingInfo.arriveDate}
            - Departure date: ${bookingInfo.departureDate}

            Thank you for booking with us!`
        }
    };

    const hostEmailPayload = {
        body: {
            toEmail: hostEmail,
            subject: "New Booking Received",
            body: `Hello,

            You have received a new booking for your property "${bookingInfo.propertyName}".

            Details:
            - Number of guests: ${bookingInfo.guests}
            - Arrival date: ${bookingInfo.arriveDate}
            - Departure date: ${bookingInfo.departureDate}

            Please prepare the property for arrival.`
        }
    };

    try {

        const userEmailResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: "EmailNotificationService",
            Payload: JSON.stringify(userEmailPayload),
        }));
        //console.log("User email sent successfully:", userEmailResponse);

        const hostEmailResponse = await lambdaClient.send(new InvokeCommand({
            FunctionName: "EmailNotificationService",
            Payload: JSON.stringify(hostEmailPayload),
        }));
        //console.log("Host email sent successfully:", hostEmailResponse);

    } catch (error) {
        console.error("Error sending email via Lambda:", error);
        throw new Error("Failed to send email.");
    }
};

export default sendEmail;


