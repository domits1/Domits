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
                'checkin_instructions': `📋 IMMEDIATE: Check-in Instructions for Your Booking\n\nWelcome! Here are your check-in details:\n\n🏠 Property: ${bookingInfo?.propertyName || 'Your booked property'}\n👥 Guests: ${bookingInfo?.guests || 1}\n📅 Check-in: ${bookingInfo ? new Date(bookingInfo.arriveDate).toLocaleDateString() : 'As scheduled'}\n\n• Check-in time: After 3:00 PM\n• Key location: Lockbox at front door\n• Wi-Fi: Network - DomitsGuest, Password - Welcome2024\n• Parking: Available in driveway\n\nPlease arrive on time and contact your host if you need anything!`,
                'checkout_instructions': `🚪 IMMEDIATE: Check-out Instructions for Your Stay\n\n📅 Check-out: ${bookingInfo ? new Date(bookingInfo.departureDate).toLocaleDateString() : 'As scheduled'}\n\nHere's what you need to know for check-out:\n\n• Check-out time: 11:00 AM\n• Please remove all belongings\n• Return keys to lockbox\n• Take final photos of the property\n• Clean up and respect quiet hours\n\nThank you for staying with us! We hope to see you again soon. 🌟`,
                'reminder': `⏰ Booking Reminder\n\nThis is a friendly reminder about your upcoming booking:\n\n• Check-in: ${bookingInfo ? new Date(bookingInfo.arriveDate).toLocaleDateString() : 'TBD'}\n• Guests: ${bookingInfo?.guests || 1}\n\nPlease ensure your property is ready and contact your guest if needed.`,
                'feedback_request': `⭐ We'd love your feedback!\n\nHow was your recent stay? Your feedback helps us improve our platform.\n\nPlease take a moment to leave a review for your guest experience.\n\nThank you for choosing Domits!`,
                'wifi_info': `📶 IMMEDIATE: Wi-Fi Access for Your Stay\n\n🔗 Network Details:\n• Network Name: DomitsGuest\n• Password: Welcome2024\n• Type: Secure guest network\n\nThis dedicated Wi-Fi network provides:\n✅ Fast and reliable connection\n✅ Secure browsing for all devices\n✅ 24/7 technical support available\n\nIf you experience connectivity issues, please contact your host or Domits support immediately.`
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
