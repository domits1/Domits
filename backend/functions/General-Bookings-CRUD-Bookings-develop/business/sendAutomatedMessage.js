import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "eu-north-1" });

/**
 * 
 * @param {string} senderId 
 * @param {string} recipientId
 * @param {string} propertyId 
 * @param {string} messageText 
 * @param {string} messageType 
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
    } catch (error) {
        console.error("Error sending automated message via Lambda:", error);
        
    }
};

export default sendAutomatedMessage;


