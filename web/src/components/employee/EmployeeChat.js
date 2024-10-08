import React, { useState, useEffect } from 'react';
import './EmployeeChat.css';
import { useUser } from '../../UserContext';
import { Auth } from 'aws-amplify';

const EmployeeChat = () => {
  const [chats, setChats] = useState([]); // Stores open chats
  const [activeChat, setActiveChat] = useState(null); // Tracks the active chat
  const [employeeMessage, setEmployeeMessage] = useState(''); // Message typed by employee
  const [isConnected, setIsConnected] = useState(false); // WebSocket connection status
  const [socket, setSocket] = useState(null); // WebSocket instance
  const { role, isLoading } = useUser();
  const [connectionId, setConnectionId] = useState(''); // Store connectionId

  // Prompt employee to go online
  const [wantsToConnect, setWantsToConnect] = useState(false);

  // Store chat messages by chat ID
  const [chatMessages, setChatMessages] = useState({}); // { chatID: [messages] }

  useEffect(() => {
    if (wantsToConnect && !socket) {
      connectWebSocket();
    }
  }, [wantsToConnect]);

  // Function to fetch connectionId from the backend using eChatGetConnectionId Lambda function
  const fetchConnectionId = async (userId) => {
    try {
      const response = await fetch('https://s5telb0icl.execute-api.eu-north-1.amazonaws.com/default/eChatGetConnectionId', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (response.ok) {
        // Parse the 'body' field of the response, which is a JSON string
        const parsedBody = JSON.parse(data.body);

        //console.log(parsedBody); // This should now contain the connectionId
        return parsedBody.connectionId;
      } else {
        //console.error('Error fetching connectionId:', data.message);
        return null;
      }

    } catch (error) {
      //console.error('Failed to fetch connectionId:', error);
      return null;
    }
  };

  // Function to establish WebSocket connection
  const connectWebSocket = async () => {
    const userInfo = await Auth.currentUserInfo();

    const ws = new WebSocket(
      `wss://0e39mc46j0.execute-api.eu-north-1.amazonaws.com/production/?userId=${userInfo.attributes.sub}&userName=${userInfo.attributes['given_name']}`
    );

    ws.onopen = async () => {
      //console.log('WebSocket connection opened');
      setIsConnected(true);

      // Fetch the connectionId using the new Lambda function
      const fetchedConnectionId = await fetchConnectionId(userInfo.attributes.sub);
      //console.log(fetchedConnectionId)
      if (fetchedConnectionId) {
        setConnectionId(fetchedConnectionId);
        await setEmployeeAvailability(true, userInfo.attributes.sub, fetchedConnectionId);
      }
    };

    ws.onmessage = (event) => {
      const incomingMessage = JSON.parse(event.data);

      // Handle normal chat messages
      if (incomingMessage.senderId && incomingMessage.message) {
        const senderId = incomingMessage.senderId;
        const message = { role: 'user', content: incomingMessage.message };

        // Add the message to the appropriate chat
        setChatMessages((prevChatMessages) => {
          const prevMessages = prevChatMessages[senderId] || [];
          return { ...prevChatMessages, [senderId]: [...prevMessages, message] };
        });

        // If a new message comes in, either add to an existing chat or create a new one
        setChats((prevChats) => {
          const existingChat = prevChats.find((chat) => chat.chatID === senderId);

          // Create new chat if it doesn't exist
          if (!existingChat) {
            return [...prevChats, { chatID: senderId, userName: 'User' }];
          }

          return prevChats;
        });
      }
    };

    ws.onerror = (error) => {
      //console.error('WebSocket error observed:', error);
    };

    ws.onclose = async (event) => {
      //console.log('WebSocket connection closed:', event);
      setIsConnected(false);
      setSocket(null);
      // Set employee availability to false on disconnect
      await setEmployeeAvailability(false, userInfo.attributes.sub, connectionId || '');
    };

    setSocket(ws);
  };

  // Function to close WebSocket connection and go offline
  const disconnectWebSocket = () => {
    if (socket) {
      socket.close();
      setWantsToConnect(false);
      setIsConnected(false);
      setSocket(null);
      //console.log('WebSocket connection closed by user');
    }
  };

  // Set employee availability in the database
  const setEmployeeAvailability = async (isAvailable, employeeId, connectionId) => {
    const payload = {
      employeeId,
      connectionId: connectionId || '', // Set to empty string if connectionId is not present
      isAvailable,
    };

    try {
      const response = await fetch('https://nw6g99dmhe.execute-api.eu-north-1.amazonaws.com/default/eChatSetEmployeeAvailability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to set employee availability');
      }

      const data = await response.json();
      //console.log(data.message);
    } catch (error) {
      //console.error(error.message);
    }
  };

  // Handle the selection of a chat
  const selectChat = (chatID) => {
    setActiveChat(chatID);
  };

  // Handle sending a message
  const sendMessage = () => {
    if (employeeMessage.trim() === '' || !activeChat || !socket) return;

    const payload = {
      action: 'sendMessage',
      recipientConnectionId: activeChat,
      message: employeeMessage,
    };

    socket.send(JSON.stringify(payload));

    // Append sent message to the chat
    const newMessage = { role: 'employee', content: employeeMessage };
    setChatMessages((prevChatMessages) => ({
      ...prevChatMessages,
      [activeChat]: [...(prevChatMessages[activeChat] || []), newMessage],
    }));

    setEmployeeMessage(''); // Clear the input field
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (role !== 'Employee') {
    return null;
  }

  return (
    <div className="ec-employee-chat-container">
      <div className="ec-status-bar">
        {isConnected ? (
          <div className="ec-online-status">
            <span className="ec-status-indicator online"></span> Online
          </div>
        ) : (
          <div className="ec-online-status">
            <span className="ec-status-indicator offline"></span> Offline
          </div>
        )}
        {!wantsToConnect && !isConnected && (
          <button className="ec-go-online" onClick={() => setWantsToConnect(true)}>
            Go Online
          </button>
        )}
        {isConnected && (
          <button className="ec-go-offline" onClick={disconnectWebSocket}>
            Go Offline
          </button>
        )}
      </div>

      <div className="ec-chat-box">
        {isConnected ? (
          <>
            <div className="ec-chat-list">
              <h3>Open Chats</h3>
              <ul>
                {chats.map((chat) => (
                  <li key={chat.chatID} onClick={() => selectChat(chat.chatID)}>
                    Chat with {chat.userName}
                  </li>
                ))}
              </ul>
            </div>

            <div className="ec-chat-window">
              {activeChat ? (
                <>
                  <div className="ec-chat-messages">
                    {(chatMessages[activeChat] || []).map((message, index) => (
                      <div key={index} className={`ec-message-wrapper ${message.role}`}>
                        <span className="ec-sender-label">
                          {message.role === 'employee' ? 'You' : 'User'}
                        </span>
                        <div className={`ec-message ${message.role}`}>
                          <div className={`ec-bubble ${message.role}`}>
                            <p>{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="ec-chat-input">
                    <input
                      type="text"
                      value={employeeMessage}
                      onChange={(e) => setEmployeeMessage(e.target.value)}
                      placeholder="Type a message..."
                    />
                    <button onClick={sendMessage}>Send</button>
                  </div>
                </>
              ) : (
                <div className="ec-no-chat-selected">Select a chat to start messaging</div>
              )}
            </div>
          </>
        ) : (
          <div className="ec-no-chat-connection">Please connect to start messaging</div>
        )}
      </div>
    </div>
  );
};

export default EmployeeChat;
