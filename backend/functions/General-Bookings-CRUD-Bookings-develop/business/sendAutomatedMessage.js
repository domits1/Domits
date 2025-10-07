const https = require('https');

const sendAutomatedMessage = async (messageData) => {
    try {
        const { hostId, guestId, propertyId, bookingInfo } = messageData;

        // Format the automated message
        const messageText = `🎉 New booking received!\n\n` +
            `Property: ${bookingInfo.propertyName}\n` +
            `Guests: ${bookingInfo.guests}\n` +
            `Check-in: ${new Date(bookingInfo.arriveDate).toLocaleDateString()}\n` +
            `Check-out: ${new Date(bookingInfo.departureDate).toLocaleDateString()}\n\n` +
            `Please review the booking details and prepare for your guest's arrival.`;

        // Prepare the message data for the WebSocket API
        const messagePayload = {
            action: "sendMessage",
            userId: guestId, // The guest is sending the message
            recipientId: hostId,
            text: messageText,
            propertyId: propertyId,
            isAutomated: true,
            messageType: "booking_notification"
        };

        // Send the message via the WebSocket API
        const apiUrl = 'https://tgkskhfz79.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Create-WebSocketMessage';

        const postData = JSON.stringify({
            action: "sendMessage",
            ...messagePayload
        });

        const options = {
            hostname: 'tgkskhfz79.execute-api.eu-north-1.amazonaws.com',
            port: 443,
            path: '/General-Messaging-Production-Create-WebSocketMessage',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        console.log('Automated message sent successfully:', response);
                        resolve(response);
                    } catch (error) {
                        console.error('Error parsing automated message response:', error);
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Error sending automated message:', error);
                reject(error);
            });

            req.write(postData);
            req.end();
        });

    } catch (error) {
        console.error('Error in sendAutomatedMessage:', error);
        throw error;
    }
};

export default sendAutomatedMessage;
