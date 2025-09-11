import https from 'https';

class AutomatedMessageService {
    constructor() {
        this.messagingApiUrl = 'https://tgkskhfz79.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Create-WebSocketMessage';
    }

    async sendAutomatedMessage(messageData) {
        try {
            const { hostId, guestId, propertyId, messageType, customMessage, bookingInfo } = messageData;

            // Get default message templates based on message type
            const messageTemplates = {
                'booking_confirmation': `🎉 New booking received!\n\nProperty: ${bookingInfo?.propertyName || 'Your property'}\nGuests: ${bookingInfo?.guests || 1}\nCheck-in: ${bookingInfo ? new Date(bookingInfo.arriveDate).toLocaleDateString() : 'TBD'}\nCheck-out: ${bookingInfo ? new Date(bookingInfo.departureDate).toLocaleDateString() : 'TBD'}\n\nPlease review the booking details and prepare for your guest's arrival.`,
                'checkin_instructions': `📋 Check-in Instructions\n\nYour guest will arrive soon! Here's what you need to know:\n\n• Check-in time: After 3:00 PM\n• Key location: Lockbox at front door\n• Wi-Fi: Network - DomitsGuest, Password - Welcome2024\n• Parking: Available in driveway\n\nPlease ensure the property is ready for your guest's arrival.`,
                'checkout_instructions': `🚪 Check-out Reminder\n\nYour guest's check-out time is approaching:\n\n• Check-out time: 11:00 AM\n• Please ensure all belongings are removed\n• Return keys to lockbox\n• Take final photos of the property\n\nThank you for hosting with Domits!`,
                'reminder': `⏰ Booking Reminder\n\nThis is a friendly reminder about your upcoming booking:\n\n• Check-in: ${bookingInfo ? new Date(bookingInfo.arriveDate).toLocaleDateString() : 'TBD'}\n• Guests: ${bookingInfo?.guests || 1}\n\nPlease ensure your property is ready and contact your guest if needed.`,
                'feedback_request': `⭐ We'd love your feedback!\n\nHow was your recent stay? Your feedback helps us improve our platform.\n\nPlease take a moment to leave a review for your guest experience.\n\nThank you for choosing Domits!`,
                'wifi_info': `📶 Wi-Fi Information\n\nNetwork: DomitsGuest\nPassword: Welcome2024\n\nThis is a dedicated guest network for faster, more secure browsing.\n\nIf you experience any connectivity issues, please contact support.`
            };

            // Use custom message if provided, otherwise use template
            const messageText = customMessage || messageTemplates[messageType] || messageTemplates['booking_confirmation'];

            // Prepare the message data for the WebSocket API
            const messagePayload = {
                action: "sendMessage",
                userId: guestId, // The guest is sending the automated message
                recipientId: hostId,
                text: messageText,
                propertyId: propertyId,
                isAutomated: true,
                messageType: messageType,
                timestamp: new Date().toISOString()
            };

            // Send the message via the WebSocket API
            return new Promise((resolve, reject) => {
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

                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            const response = JSON.parse(data);
                            console.log(`Automated ${messageType} message sent successfully:`, response);
                            resolve(response);
                        } catch (error) {
                            console.error('Error parsing automated message response:', error);
                            reject(error);
                        }
                    });
                });

                req.on('error', (error) => {
                    console.error(`Error sending automated ${messageType} message:`, error);
                    reject(error);
                });

                req.write(postData);
                req.end();
            });

        } catch (error) {
            console.error('Error in AutomatedMessageService:', error);
            throw error;
        }
    }

    async sendBookingConfirmation(hostId, guestId, propertyId, bookingInfo) {
        return this.sendAutomatedMessage({
            hostId,
            guestId,
            propertyId,
            messageType: 'booking_confirmation',
            bookingInfo
        });
    }

    async sendCheckInInstructions(hostId, guestId, propertyId, bookingInfo) {
        return this.sendAutomatedMessage({
            hostId,
            guestId,
            propertyId,
            messageType: 'checkin_instructions',
            bookingInfo
        });
    }

    async sendCheckOutInstructions(hostId, guestId, propertyId, bookingInfo) {
        return this.sendAutomatedMessage({
            hostId,
            guestId,
            propertyId,
            messageType: 'checkout_instructions',
            bookingInfo
        });
    }

    async sendReminder(hostId, guestId, propertyId, bookingInfo) {
        return this.sendAutomatedMessage({
            hostId,
            guestId,
            propertyId,
            messageType: 'reminder',
            bookingInfo
        });
    }

    async sendFeedbackRequest(hostId, guestId, propertyId, bookingInfo) {
        return this.sendAutomatedMessage({
            hostId,
            guestId,
            propertyId,
            messageType: 'feedback_request',
            bookingInfo
        });
    }

    async sendWifiInfo(hostId, guestId, propertyId, bookingInfo) {
        return this.sendAutomatedMessage({
            hostId,
            guestId,
            propertyId,
            messageType: 'wifi_info',
            bookingInfo
        });
    }
}

export default AutomatedMessageService;
