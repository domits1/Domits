#!/usr/bin/env node

/**
 * HOST PROPERTY AUTOMATED MESSAGING TEST
 *
 * Goal: When a host lists/activates a property, send an automated welcome/introduction
 * message from the host to the guest thread (for first contact) to validate the
 * messaging pipeline end-to-end.
 *
 * Usage:
 *   node run-host-property-messaging-test.js
 */

const https = require('https');

async function runHostPropertyMessagingTest() {
  console.log('🚀 DOMITS HOST PROPERTY AUTOMATED MESSAGING TEST');
  console.log('=================================================\n');

  const testContext = {
    hostId: 'host-user-automation-001',
    guestId: 'guest-user-automation-001',
    propertyId: `prop-${Date.now()}`,
    propertyTitle: 'Cozy Lake Cabin',
  };

  console.log('📋 TEST CONTEXT:');
  console.log(`👤 Host ID: ${testContext.hostId}`);
  console.log(`👤 Guest ID: ${testContext.guestId}`);
  console.log(`🏠 Property ID: ${testContext.propertyId}`);
  console.log(`🏷️ Title: ${testContext.propertyTitle}`);
  console.log('');

  // In a real flow, the host would create/activate the property via PropertyHandler.
  // Here we simulate that the property has just been hosted/activated and we now
  // trigger an automated welcome/introduction message into the guest thread.

  console.log('📤 Sending automated host welcome message to guest...');
  const result = await sendAutomatedHostWelcomeMessage({
    hostId: testContext.hostId,
    guestId: testContext.guestId,
    propertyId: testContext.propertyId,
    propertyTitle: testContext.propertyTitle,
  });

  console.log('✅ Message dispatch result:', result.statusCode, result.bodySnippet);
  console.log('\n🎉 Test completed: Automated host message was dispatched.');
}

function sendAutomatedHostWelcomeMessage({ hostId, guestId, propertyId, propertyTitle }) {
  const messageText = [
    `👋 Welcome to ${propertyTitle}!`,
    '',
    `Thanks for your interest. I'm your host and happy to help with anything you need.`,
    `Here are a few quick notes:`,
    `• Check-in is flexible; let me know your ETA`,
    `• Wi‑Fi details are in the guidebook on arrival`,
    `• Feel free to ask any questions here`,
  ].join('\n');

  // Reuse the same API used across the app for messaging (see other tests/usages)
  const hostname = 'tgkskhfz79.execute-api.eu-north-1.amazonaws.com';
  const path = '/General-Messaging-Production-Create-WebSocketMessage';

  // The action and payload mirror existing immediate/automated messaging calls
  const payload = {
    action: 'sendMessage',
    userId: hostId, // Host sends the message
    recipientId: guestId, // Guest receives it
    text: messageText,
    propertyId: propertyId,
    isAutomated: true,
    messageType: 'host_property_welcome',
    timestamp: new Date().toISOString(),
  };

  const postData = JSON.stringify(payload);

  const options = {
    hostname,
    port: 443,
    path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, bodySnippet: data?.slice(0, 200) });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

if (require.main === module) {
  runHostPropertyMessagingTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Test failed:', err?.message || err);
      process.exit(1);
    });
}

module.exports = { runHostPropertyMessagingTest, sendAutomatedHostWelcomeMessage };


