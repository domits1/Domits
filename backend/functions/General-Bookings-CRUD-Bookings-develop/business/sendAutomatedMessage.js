import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "eu-north-1" });

/**
 * Sends an automated message via the Messaging Lambda.
 * 
 * @param {string} senderId - The ID of the sender (usually Host ID for confirmation)
 * @param {string} recipientId - The ID of the recipient (usually Guest ID)
 * @param {string} propertyId - The ID of the property
 * @param {string} messageText - The content of the message
 * @param {string} messageType - The type of automated message (e.g., 'booking_confirmation')
 */
const sendAutomatedMessage = async (senderId, recipientId, propertyId, messageText, messageType) => {
    const payload = {
        action: "sendMessage",
        userId: senderId,
        recipientId: recipientId,
        propertyId: propertyId,
        text: messageText,
        isAutomated: true,
        messageType: messageType || "booking_confirmation"
    };

    try {
        const command = new InvokeCommand({
            FunctionName: "General-Messaging-Production-Create-WebSocketMessage",
            Payload: JSON.stringify(payload),
        });

        await lambdaClient.send(command);
        // console.log("Automated message sent successfully");
    } catch (error) {
        console.error("Error sending automated message via Lambda:", error);
        // We intentionally do not throw here to ensure the booking process completes 
        // even if the message fails to send.
    }
};

export default sendAutomatedMessage;


