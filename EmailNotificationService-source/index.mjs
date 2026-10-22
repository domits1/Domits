import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({ region: "eu-north-1" });

export const handler = async (event) => {
    try {
        const requestBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        const { toEmail, subject, body, htmlBody } = requestBody ?? {};

        if (!toEmail || !subject || !body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing required parameters." })
            };
        }

        if (htmlBody !== undefined && typeof htmlBody !== "string") {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "htmlBody must be a string." })
            };
        }

        const params = {
            Destination: { ToAddresses: [toEmail] },
            Message: {
                Body: {
                    Text: { Charset: "UTF-8", Data: body },
                    ...(htmlBody?.trim() ? { Html: { Charset: "UTF-8", Data: htmlBody } } : {})
                },
                Subject: { Charset: "UTF-8", Data: subject }
            },
            Source: "teamdomits@gmail.com"
        };

        await sesClient.send(new SendEmailCommand(params));

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Email sent successfully!" })
        };
    } catch (error) {
        console.error("Error sending email:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Failed to send email.", error: error.message })
        };
    }
};
