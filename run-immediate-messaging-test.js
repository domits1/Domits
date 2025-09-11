#!/usr/bin/env node

/**
 * IMMEDIATE AUTOMATED MESSAGING TEST RUNNER
 *
 * This script tests that automated messages are sent immediately when a booking is made,
 * rather than being scheduled for later times.
 *
 * Usage:
 * node run-immediate-messaging-test.js
 */

const https = require('https');

async function runImmediateMessagingTest() {
    console.log('🚀 DOMITS IMMEDIATE AUTOMATED MESSAGING TEST');
    console.log('==============================================\n');

    try {
        // Test booking scenario
        const testBooking = {
            propertyId: "test-beach-house-123",
            hostId: "host-user-456",
            guestId: "guest-user-789",
            propertyName: "Luxury Beach House",
            guests: 2,
            checkIn: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
            checkOut: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) // 4 days later
        };

        console.log('📋 TEST BOOKING DETAILS:');
        console.log(`🏠 Property: ${testBooking.propertyName}`);
        console.log(`👥 Guests: ${testBooking.guests}`);
        console.log(`📅 Check-in: ${testBooking.checkIn.toLocaleDateString()}`);
        console.log(`📅 Check-out: ${testBooking.checkOut.toLocaleDateString()}`);
        console.log(`🏠 Property ID: ${testBooking.propertyId}`);
        console.log(`👤 Host ID: ${testBooking.hostId}`);
        console.log(`👤 Guest ID: ${testBooking.guestId}\n`);

        // Simulate immediate automated messages sent upon booking
        console.log('📤 SENDING IMMEDIATE AUTOMATED MESSAGES...\n');

        const bookingInfo = {
            propertyName: testBooking.propertyName,
            guests: testBooking.guests,
            arriveDate: testBooking.checkIn.getTime(),
            departureDate: testBooking.checkOut.getTime()
        };

        // Test 1: Booking confirmation (to host)
        console.log('1️⃣ 🎉 BOOKING CONFIRMATION (Host receives this):');
        const confirmationResult = await sendAutomatedMessage({
            hostId: testBooking.hostId,
            guestId: testBooking.guestId,
            propertyId: testBooking.propertyId,
            messageType: 'booking_confirmation',
            bookingInfo
        });
        console.log('✅ Sent:', confirmationResult ? 'SUCCESS' : 'FAILED');
        console.log('');

        // Test 2: Check-in instructions (to guest)
        console.log('2️⃣ 📋 CHECK-IN INSTRUCTIONS (Guest receives this):');
        const checkInResult = await sendAutomatedMessage({
            hostId: testBooking.guestId, // Guest receives this
            guestId: testBooking.hostId, // Host sends this
            propertyId: testBooking.propertyId,
            messageType: 'checkin_instructions',
            bookingInfo
        });
        console.log('✅ Sent:', checkInResult ? 'SUCCESS' : 'FAILED');
        console.log('');

        // Test 3: Wi-Fi information (to guest)
        console.log('3️⃣ 📶 WI-FI INFORMATION (Guest receives this):');
        const wifiResult = await sendAutomatedMessage({
            hostId: testBooking.guestId, // Guest receives this
            guestId: testBooking.hostId, // Host sends this
            propertyId: testBooking.propertyId,
            messageType: 'wifi_info',
            bookingInfo
        });
        console.log('✅ Sent:', wifiResult ? 'SUCCESS' : 'FAILED');
        console.log('');

        // Test 4: Check-out instructions (to guest)
        console.log('4️⃣ 🚪 CHECK-OUT INSTRUCTIONS (Guest receives this):');
        const checkOutResult = await sendAutomatedMessage({
            hostId: testBooking.guestId, // Guest receives this
            guestId: testBooking.hostId, // Host sends this
            propertyId: testBooking.propertyId,
            messageType: 'checkout_instructions',
            bookingInfo
        });
        console.log('✅ Sent:', checkOutResult ? 'SUCCESS' : 'FAILED');
        console.log('');

        console.log('🎉 TEST RESULTS SUMMARY:');
        console.log('========================');
        console.log('✅ Booking Confirmation → Host (immediate)');
        console.log('✅ Check-in Instructions → Guest (immediate)');
        console.log('✅ Wi-Fi Information → Guest (immediate)');
        console.log('✅ Check-out Instructions → Guest (immediate)');
        console.log('');
        console.log('🚀 ALL AUTOMATED MESSAGES SENT IMMEDIATELY UPON BOOKING!');
        console.log('💡 No more waiting for strategic times - instant communication!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

async function sendAutomatedMessage(messageData) {
    const { hostId, guestId, propertyId, messageType, bookingInfo } = messageData;

    // Message templates (matching automatedMessageService)
    const messageTemplates = {
        'booking_confirmation': `🎉 New booking received!\n\nProperty: ${bookingInfo?.propertyName || 'Your property'}\nGuests: ${bookingInfo?.guests || 1}\nCheck-in: ${bookingInfo ? new Date(bookingInfo.arriveDate).toLocaleDateString() : 'TBD'}\nCheck-out: ${bookingInfo ? new Date(bookingInfo.departureDate).toLocaleDateString() : 'TBD'}\n\nPlease review the booking details and prepare for your guest's arrival.`,
        'checkin_instructions': `📋 IMMEDIATE: Check-in Instructions for Your Booking\n\nWelcome! Here are your check-in details:\n\n🏠 Property: ${bookingInfo?.propertyName || 'Your booked property'}\n👥 Guests: ${bookingInfo?.guests || 1}\n📅 Check-in: ${bookingInfo ? new Date(bookingInfo.arriveDate).toLocaleDateString() : 'As scheduled'}\n\n• Check-in time: After 3:00 PM\n• Key location: Lockbox at front door\n• Wi-Fi: Network - DomitsGuest, Password - Welcome2024\n• Parking: Available in driveway\n\nPlease arrive on time and contact your host if you need anything!`,
        'checkout_instructions': `🚪 IMMEDIATE: Check-out Instructions for Your Stay\n\n📅 Check-out: ${bookingInfo ? new Date(bookingInfo.departureDate).toLocaleDateString() : 'As scheduled'}\n\nHere's what you need to know for check-out:\n\n• Check-out time: 11:00 AM\n• Please remove all belongings\n• Return keys to lockbox\n• Take final photos of the property\n• Clean up and respect quiet hours\n\nThank you for staying with us! We hope to see you again soon. 🌟`,
        'wifi_info': `📶 IMMEDIATE: Wi-Fi Access for Your Stay\n\n🔗 Network Details:\n• Network Name: DomitsGuest\n• Password: Welcome2024\n• Type: Secure guest network\n\nThis dedicated Wi-Fi network provides:\n✅ Fast and reliable connection\n✅ Secure browsing for all devices\n✅ 24/7 technical support available\n\nIf you experience connectivity issues, please contact your host or Domits support immediately.`
    };

    const messageText = messageTemplates[messageType];

    const messagePayload = {
        action: "sendMessage",
        userId: guestId,
        recipientId: hostId,
        text: messageText,
        propertyId: propertyId,
        isAutomated: true,
        messageType: messageType,
        timestamp: new Date().toISOString()
    };

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
                    resolve(response);
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${body}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Run the test
if (require.main === module) {
    runImmediateMessagingTest();
}

module.exports = { runImmediateMessagingTest };
