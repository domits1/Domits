const sendAutomatedMessage = async (senderId, recipientId, propertyId, messageText, messageType) => {
    const payload = {
        senderId: senderId,
        recipientId: recipientId,
        propertyId: propertyId,
        content: messageText,
        platform: "DOMITS",
        metadata: {
            isAutomated: true,
            messageType: messageType || "booking_confirmation"
        }
    };

    try {
        const response = await fetch("https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error("Failed to send automated message via UnifiedMessaging:", response.status, response.statusText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("Automated message sent successfully via UnifiedMessaging:", result);
        
    } catch (error) {
        console.error("Error sending automated message:", error);
        
        try {
            const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
            const lambdaClient = new LambdaClient({ region: "eu-north-1" });
            
            const legacyPayload = {
                action: "sendMessage",
                userId: senderId,
                recipientId: recipientId,
                propertyId: propertyId,
                text: messageText,
                isAutomated: true,
                messageType: messageType || "booking_confirmation"
            };

            const command = new InvokeCommand({
                FunctionName: "General-Messaging-Production-Create-WebSocketMessage",
                Payload: JSON.stringify(legacyPayload),
            });

            await lambdaClient.send(command);
            console.log("Fallback: Sent via legacy system");
        } catch (fallbackError) {
            console.error("Both UnifiedMessaging and legacy system failed:", fallbackError);
        }
    }
};

export default sendAutomatedMessage;