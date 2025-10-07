const https = require('https');

// Test script to verify messaging integration
async function testMessagingIntegration() {
    console.log('🧪 Testing messaging integration...');

    try {
        // Test 1: Initiate conversation
        console.log('📝 Test 1: Initiating conversation...');
        const initResponse = await makeApiCall('/General-Messaging-Production-Create-WebSocketMessage', {
            action: "initiateConversation",
            hostId: "test-host-id",
            propertyId: "test-property-id"
        });
        console.log('✅ Conversation initiated:', initResponse);

        // Test 2: Send message
        console.log('💬 Test 2: Sending message...');
        const messageResponse = await makeApiCall('/General-Messaging-Production-Create-WebSocketMessage', {
            action: "sendMessage",
            userId: "test-guest-id",
            recipientId: "test-host-id",
            text: "Hello! I'm interested in booking your property.",
            propertyId: "test-property-id"
        });
        console.log('✅ Message sent:', messageResponse);

        // Test 3: Send automated message
        console.log('🤖 Test 3: Sending automated message...');
        const autoMessageResponse = await makeApiCall('/General-Messaging-Production-Create-WebSocketMessage', {
            action: "sendMessage",
            userId: "test-guest-id",
            recipientId: "test-host-id",
            text: "🎉 New booking received!\n\nProperty: Test Property\nGuests: 2\nCheck-in: Tomorrow\nCheck-out: Next Week",
            propertyId: "test-property-id",
            isAutomated: true,
            messageType: "booking_notification"
        });
        console.log('✅ Automated message sent:', autoMessageResponse);

        console.log('🎉 All messaging tests passed!');

    } catch (error) {
        console.error('❌ Messaging test failed:', error.message);
        throw error;
    }
}

function makeApiCall(path, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);

        const options = {
            hostname: 'tgkskhfz79.execute-api.eu-north-1.amazonaws.com',
            port: 443,
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

// Run the test if this file is executed directly
if (require.main === module) {
    testMessagingIntegration()
        .then(() => {
            console.log('✅ All tests completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Tests failed:', error);
            process.exit(1);
        });
}

module.exports = { testMessagingIntegration };
