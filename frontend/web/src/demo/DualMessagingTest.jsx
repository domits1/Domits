import React, { useState, useEffect } from 'react';
import ChatScreen from '../components/messages/ChatScreen';
import { WebSocketProvider } from '../features/hostdashboard/hostmessages/context/webSocketContext';
import './DualMessagingTest.css';

const DualMessagingTest = () => {
  // State voor account informatie
  const [hostUserId, setHostUserId] = useState('');
  const [guestUserId, setGuestUserId] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  // Contact informatie
  const hostContactInfo = {
    id: guestUserId,
    name: 'Test Guest User',
    image: null
  };

  const guestContactInfo = {
    id: hostUserId,
    name: 'Test Host User',
    image: null
  };

  const [hostMessages, setHostMessages] = useState([]);
  const [guestMessages, setGuestMessages] = useState([]);

  const handleHostMessage = (message) => {
    setHostMessages(prev => [...prev, message]);
  };

  const handleGuestMessage = (message) => {
    setGuestMessages(prev => [...prev, message]);
  };

  const handleSetupComplete = () => {
    if (hostUserId && guestUserId && hostUserId !== guestUserId) {
      setIsConfigured(true);
    }
  };

  // Account setup formulier
  const AccountSetupForm = () => (
    <div className="account-setup-guide">
      <h3>🔧 Account Setup voor Messaging Test</h3>

      <div className="warning-box">
        <h4>⚠️ Belangrijk</h4>
        <p>Je hebt 2 echte Domits accounts nodig om messaging te testen. Maak deze eerst aan via de normale registratie als je ze nog niet hebt.</p>
      </div>

      <div className="setup-steps">
        <div className="setup-step">
          <h4>1️⃣ Host Account Configureren</h4>
          <ul>
            <li>Log in als host in browser 1 (of incognito mode)</li>
            <li>Ga naar je profiel en kopieer je User ID</li>
            <li>Voer hieronder je Host User ID in</li>
          </ul>
          <input
            type="text"
            placeholder="Host User ID (bijv: 12345678-1234-1234-1234-123456789012)"
            value={hostUserId}
            onChange={(e) => setHostUserId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '10px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white'
            }}
          />
        </div>

        <div className="setup-step">
          <h4>2️⃣ Guest Account Configureren</h4>
          <ul>
            <li>Log in als guest in browser 2 (of andere browser)</li>
            <li>Ga naar je profiel en kopieer je User ID</li>
            <li>Voer hieronder je Guest User ID in</li>
          </ul>
          <input
            type="text"
            placeholder="Guest User ID (bijv: 87654321-4321-4321-4321-210987654321)"
            value={guestUserId}
            onChange={(e) => setGuestUserId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '10px',
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white'
            }}
          />
        </div>
      </div>

      <div className="setup-step" style={{marginTop: '20px', gridColumn: '1 / -1'}}>
        <h4>3️⃣ Accounts aan elkaar toevoegen</h4>
        <p>Belangrijk: Je moet eerst contact verzoeken versturen tussen de accounts voordat je kunt chatten:</p>
        <ul>
          <li>Als host: ga naar Messages → zoek guest user → stuur contact verzoek</li>
          <li>Als guest: accepteer het contact verzoek in je notifications</li>
          <li>OF andersom: guest stuurt verzoek, host accepteert</li>
        </ul>
      </div>

      <button
        onClick={handleSetupComplete}
        disabled={!hostUserId || !guestUserId || hostUserId === guestUserId}
        style={{
          background: (hostUserId && guestUserId && hostUserId !== guestUserId) ? '#48bb78' : '#a0aec0',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '1.1rem',
          cursor: (hostUserId && guestUserId && hostUserId !== guestUserId) ? 'pointer' : 'not-allowed',
          marginTop: '20px',
          width: '100%'
        }}
      >
        Start Messaging Test
      </button>
    </div>
  );

  if (!isConfigured) {
    return (
      <div className="dual-messaging-container">
        <div className="messaging-header">
          <h1>Dual Messaging Test - Host & Guest</h1>
          <p>Test messaging tussen 2 echte Domits accounts</p>
        </div>
        <AccountSetupForm />
        <HowToGuide />
      </div>
    );
  }

  return (
    <div className="dual-messaging-container">
      <div className="messaging-header">
        <h1>Dual Messaging Test - Host & Guest</h1>
        <p>Live messaging test tussen echte accounts</p>
        <div className="test-info">
          <div className="user-info">
            <strong>Host:</strong> {hostUserId}
          </div>
          <div className="user-info">
            <strong>Guest:</strong> {guestUserId}
          </div>
        </div>
        <button
          onClick={() => setIsConfigured(false)}
          style={{
            background: '#e53e3e',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Reset Setup
        </button>
      </div>

      <div className="dual-chat-container">
        {/* Host Chat Side */}
        <div className="chat-side host-side">
          <div className="chat-header-label">
            <h2>🏠 Host Dashboard</h2>
            <span className="user-id">User: {hostUserId.slice(0, 8)}...</span>
          </div>
          <WebSocketProvider userId={hostUserId}>
            <ChatScreen
              userId={hostUserId}
              contactId={hostContactInfo.id}
              contactName={hostContactInfo.name}
              contactImage={hostContactInfo.image}
              handleContactListMessage={handleHostMessage}
              onBack={null}
              dashboardType="host"
            />
          </WebSocketProvider>
        </div>

        {/* Divider */}
        <div className="chat-divider">
          <div className="divider-line"></div>
          <span className="divider-text">↔️</span>
          <div className="divider-line"></div>
        </div>

        {/* Guest Chat Side */}
        <div className="chat-side guest-side">
          <div className="chat-header-label">
            <h2>👤 Guest Dashboard</h2>
            <span className="user-id">User: {guestUserId.slice(0, 8)}...</span>
          </div>
          <WebSocketProvider userId={guestUserId}>
            <ChatScreen
              userId={guestUserId}
              contactId={guestContactInfo.id}
              contactName={guestContactInfo.name}
              contactImage={guestContactInfo.image}
              handleContactListMessage={handleGuestMessage}
              onBack={null}
              dashboardType="guest"
            />
          </WebSocketProvider>
        </div>
      </div>

      <TestInstructions />
      <MessageDebugInfo hostMessages={hostMessages} guestMessages={guestMessages} />
    </div>
  );
};

const HowToGuide = () => (
  <div className="test-instructions">
    <h3>📋 Stap-voor-Stap Handleiding</h3>
    <div className="setup-steps">
      <div className="setup-step" style={{background: 'white', color: '#333', padding: '20px', borderRadius: '8px'}}>
        <h4 style={{color: '#2c5282'}}>A. User ID's Vinden</h4>
        <ol>
          <li>Log in op je Domits host account</li>
          <li>Ga naar je profiel/settings</li>
          <li>Kopieer je User ID (meestal een UUID format)</li>
          <li>Herhaal dit voor je guest account</li>
        </ol>
      </div>
      <div className="setup-step" style={{background: 'white', color: '#333', padding: '20px', borderRadius: '8px'}}>
        <h4 style={{color: '#2c5282'}}>B. Contact Verzoek Versturen</h4>
        <ol>
          <li>Als host: ga naar Messages sectie</li>
          <li>Zoek naar de guest user (via user ID of naam)</li>
          <li>Stuur een contact verzoek</li>
          <li>Als guest: accepteer het verzoek in notifications</li>
        </ol>
      </div>
    </div>

    <div className="success-box">
      <h4>✅ Wanneer Succesvol</h4>
      <p>Je accounts verschijnen in elkaars contact lijst en je kunt berichten uitwisselen. Deze test pagina toont beide chats naast elkaar voor makkelijk testen.</p>
    </div>
  </div>
);

const TestInstructions = () => (
  <div className="test-instructions">
    <h3>🧪 Test Instructies</h3>
    <ol>
      <li><strong>Browser Setup:</strong> Open 2 verschillende browsers of gebruik incognito mode</li>
      <li><strong>Account Login:</strong> Log in als host in browser 1, guest in browser 2</li>
      <li><strong>Real-time Test:</strong> Stuur berichten heen en weer om WebSocket functionaliteit te testen</li>
      <li><strong>Geautomatiseerde Berichten:</strong> Test de "Test messages" knop voor template berichten</li>
      <li><strong>Bijlagen:</strong> Test file uploads en preview functionaliteit</li>
      <li><strong>Zoeken:</strong> Test de message search functionaliteit</li>
    </ol>

    <div className="test-tips">
      <h4>💡 Pro Tips</h4>
      <ul>
        <li>Gebruik Chrome DevTools → Network tab om WebSocket verbindingen te monitoren</li>
        <li>Check browser console voor WebSocket connection status en errors</li>
        <li>Test met verschillende bestand types voor attachments</li>
        <li>Probeer lange berichten om character limits te testen (200 chars)</li>
        <li>Test notificaties door focus te wisselen tussen browsers</li>
        <li>Refresh een browser om reconnection logic te testen</li>
      </ul>
    </div>
  </div>
);

const MessageDebugInfo = ({ hostMessages, guestMessages }) => (
  <div className="debug-section">
    <h3>📝 Message Debug Info</h3>
    <div className="debug-messages">
      <div className="debug-host">
        <h4>Host Messages Sent ({hostMessages.length})</h4>
        <div className="message-list">
          {hostMessages.length === 0 ? (
            <p style={{color: '#a0aec0', fontStyle: 'italic'}}>Nog geen berichten verzonden...</p>
          ) : (
            hostMessages.slice(-5).map(msg => (
              <div key={msg.id} className="debug-message">
                <small>{new Date(msg.createdAt).toLocaleTimeString()}</small>
                <p>{msg.text || '[Attachment only]'}</p>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="debug-guest">
        <h4>Guest Messages Sent ({guestMessages.length})</h4>
        <div className="message-list">
          {guestMessages.length === 0 ? (
            <p style={{color: '#a0aec0', fontStyle: 'italic'}}>Nog geen berichten verzonden...</p>
          ) : (
            guestMessages.slice(-5).map(msg => (
              <div key={msg.id} className="debug-message">
                <small>{new Date(msg.createdAt).toLocaleTimeString()}</small>
                <p>{msg.text || '[Attachment only]'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
);

export default DualMessagingTest;
