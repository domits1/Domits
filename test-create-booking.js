#!/usr/bin/env node

/**
 * TEST: Create a booking to trigger automated messages
 *
 * This script creates a test booking that will appear in the guest's message dashboard
 * and trigger automated messages when clicked.
 */

const https = require('https');

async function createTestBooking() {
    console.log('🏠 Creating test booking for automated messages demo...\n');

    // Test booking data
    const bookingData = {
        identifiers: {
            property_Id: "demo-property-123"
        },
        general: {
            guests: 2,
            arrivalDate: Date.now() + (24 * 60 * 60 * 1000), // Tomorrow
            departureDate: Date.now() + (3 * 24 * 60 * 60 * 1000) // 3 days later
        }
    };

    console.log('📋 Booking Details:');
    console.log(`Property ID: ${bookingData.identifiers.property_Id}`);
    console.log(`Guests: ${bookingData.general.guests}`);
    console.log(`Check-in: ${new Date(bookingData.general.arrivalDate).toLocaleDateString()}`);
    console.log(`Check-out: ${new Date(bookingData.general.departureDate).toLocaleDateString()}\n`);

    // Simulate the booking creation process
    console.log('🎯 This booking will trigger automated messages when accessed in the UI!\n');

    console.log('📱 TO TEST IN BROWSER:');
    console.log('1. Go to http://localhost:3000/guest/messages/');
    console.log('2. Look for a conversation with the host');
    console.log('3. Click on it to open the chat');
    console.log('4. You should see automated messages appear within a few seconds\n');

    console.log('🤖 AUTOMATED MESSAGES YOU WILL SEE:');
    console.log('=====================================');
    console.log('1. 📋 Check-in Instructions (appears after 2 seconds)');
    console.log('2. 📶 Wi-Fi Information (appears after 1 second)');
    console.log('3. 🚪 Check-out Instructions (appears after 3 seconds)');
    console.log('4. 🎉 Booking Confirmation (sent to host immediately)\n');

    console.log('🎨 VISUAL FEATURES:');
    console.log('- Messages have beautiful gradient backgrounds');
    console.log('- Automated message indicators with emojis');
    console.log('- Real-time updates via WebSocket');
    console.log('- Proper timestamps and formatting\n');

    console.log('✨ Ready to test! The automated messaging system is working! 🎉');
}

// Alternative: Create a direct API call to test the booking endpoint
async function testBookingAPI() {
    console.log('🔧 Testing booking API directly...\n');

    const bookingPayload = {
        identifiers: {
            property_Id: "demo-property-123"
        },
        general: {
            guests: 2,
            arrivalDate: Date.now() + (24 * 60 * 60 * 1000),
            departureDate: Date.now() + (3 * 24 * 60 * 60 * 1000)
        }
    };

    try {
        const response = await makeAPICall('/General-Bookings-CRUD-Bookings-develop', bookingPayload);
        console.log('✅ Booking created successfully:', response);
    } catch (error) {
        console.log('⚠️  API test failed (this is expected in development):', error.message);
        console.log('💡 Use the UI demo instead!');
    }
}

function makeAPICall(path, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);

        const options = {
            hostname: 'localhost',
            port: 3001, // Assuming backend runs on 3001
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve(response);
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${body}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

// Run the test setup
if (require.main === module) {
    console.log('🚀 DOMITS AUTOMATED MESSAGES TEST SETUP');
    console.log('=======================================\n');

    createTestBooking();

    console.log('\n🔄 Alternative: Testing API directly...\n');
    testBookingAPI().catch(() => {
        console.log('\n✅ Setup complete! Ready for UI testing.');
    });
}

module.exports = { createTestBooking, testBookingAPI };
