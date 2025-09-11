import React, { useState, useEffect } from 'react';

/**
 * TEST COMPONENT: Automated Messages Demo
 *
 * This component demonstrates how automated messages appear in the chat dashboard
 * when a guest books a property. Add this temporarily to your guest messages page.
 */

const TestAutomatedMessages = ({ onSendTestMessage }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [messagesSent, setMessagesSent] = useState([]);

    const testMessages = [
        {
            type: 'wifi_info',
            delay: 1000,
            content: `📶 IMMEDIATE: Wi-Fi Access for Your Stay

🔗 Network Details:
• Network Name: DomitsGuest
• Password: Welcome2024
• Type: Secure guest network

This dedicated Wi-Fi network provides:
✅ Fast and reliable connection
✅ Secure browsing for all devices
✅ 24/7 technical support available

If you experience connectivity issues, please contact your host or Domits support immediately.`,
            title: 'Wi-Fi Information'
        },
        {
            type: 'checkin_instructions',
            delay: 2000,
            content: `📋 IMMEDIATE: Check-in Instructions for Your Booking

Welcome! Here are your check-in details:

🏠 Property: Luxury Beach House with Ocean View
👥 Guests: 3
📅 Check-in: ${new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}

• Check-in time: After 3:00 PM
• Key location: Lockbox at front door
• Wi-Fi: Network - DomitsGuest, Password - Welcome2024
• Parking: Available in driveway

Please arrive on time and contact your host if you need anything!`,
            title: 'Check-in Instructions'
        },
        {
            type: 'checkout_instructions',
            delay: 3000,
            content: `🚪 IMMEDIATE: Check-out Instructions for Your Stay

📅 Check-out: ${new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}

Here's what you need to know for check-out:

• Check-out time: 11:00 AM
• Please remove all belongings
• Return keys to lockbox
• Take final photos of the property
• Clean up and respect quiet hours

Thank you for staying with us! We hope to see you again soon. 🌟`,
            title: 'Check-out Instructions'
        }
    ];

    const runAutomatedMessagesDemo = async () => {
        if (isRunning) return;

        setIsRunning(true);
        setMessagesSent([]);

        console.log('🤖 Starting Automated Messages Demo...');

        for (let i = 0; i < testMessages.length; i++) {
            const message = testMessages[i];

            // Wait for the delay
            await new Promise(resolve => setTimeout(resolve, message.delay));

            // Send the message
            if (onSendTestMessage) {
                const testMessageData = {
                    text: message.content,
                    isAutomated: true,
                    messageType: message.type,
                    createdAt: new Date().toISOString()
                };

                onSendTestMessage(testMessageData);
            }

            // Update UI
            setMessagesSent(prev => [...prev, {
                ...message,
                sentAt: new Date().toLocaleTimeString()
            }]);

            console.log(`✅ Sent: ${message.title}`);
        }

        setIsRunning(false);
        console.log('🎉 Automated Messages Demo Complete!');
    };

    return (
        <div style={{
            padding: '20px',
            background: '#f8f9fa',
            border: '2px solid #007bff',
            borderRadius: '10px',
            margin: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
            <h3 style={{ color: '#007bff', marginBottom: '15px' }}>
                🤖 Automated Messages Test
            </h3>

            <div style={{ marginBottom: '15px' }}>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    🏠 <strong>Test Property:</strong> Luxury Beach House
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    👤 <strong>Host:</strong> John Doe (Demo)
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    📅 <strong>Check-in:</strong> Tomorrow
                </p>
            </div>

            <button
                onClick={runAutomatedMessagesDemo}
                disabled={isRunning}
                style={{
                    background: isRunning ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '5px',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                }}
            >
                {isRunning ? '🚀 Sending Messages...' : '🎯 Start Automated Messages Demo'}
            </button>

            {messagesSent.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <h4 style={{ color: '#28a745' }}>✅ Messages Sent:</h4>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {messagesSent.map((msg, index) => (
                            <li key={index} style={{
                                padding: '8px',
                                margin: '5px 0',
                                background: '#e9ecef',
                                borderRadius: '5px',
                                fontSize: '14px'
                            }}>
                                <strong>{msg.title}</strong> - Sent at {msg.sentAt}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div style={{
                marginTop: '15px',
                padding: '10px',
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '5px',
                fontSize: '13px'
            }}>
                <strong>💡 How it works:</strong>
                <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Click the button to simulate booking automated messages</li>
                    <li>Messages appear in the chat above with automated styling</li>
                    <li>Each message has a gradient background and bot indicator</li>
                    <li>Messages are sent at strategic intervals (1-3 seconds)</li>
                </ol>
            </div>
        </div>
    );
};

export default TestAutomatedMessages;
