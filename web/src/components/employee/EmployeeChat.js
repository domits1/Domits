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
  const [chatIds, setChatIds] = useState({}); // Stores chat IDs per connection ID
  const { user, role, isLoading } = useUser();
  const [connectionId, setConnectionId] = useState(''); // Store connectionId
  const [wantsToConnect, setWantsToConnect] = useState(false); // Prompt employee to go online
  const [chatMessages, setChatMessages] = useState({}); // Store chat messages by chat ID { chatID: [messages] }

  useEffect(() => {
    if (wantsToConnect && !socket) {
      connectWebSocket();
    }
  }, [wantsToConnect]);

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
        const parsedBody = JSON.parse(data.body);
        return parsedBody.connectionId;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  const connectWebSocket = async () => {
    const userInfo = await Auth.currentUserInfo();

    const ws = new WebSocket(
      `wss://0e39mc46j0.execute-api.eu-north-1.amazonaws.com/production/?userId=${userInfo.attributes.sub}&userName=${userInfo.attributes['given_name']}`
    );

    ws.onopen = async () => {
      setIsConnected(true);

      const fetchedConnectionId = await fetchConnectionId(userInfo.attributes.sub);
      if (fetchedConnectionId) {
        setConnectionId(fetchedConnectionId);
        await setEmployeeAvailability(true, userInfo.attributes.sub, fetchedConnectionId);
      }
    };

    ws.onmessage = (event) => {
      const incomingMessage = JSON.parse(event.data);
      //console.log(incomingMessage);

      if (incomingMessage.senderId && incomingMessage.message) {
        const senderId = incomingMessage.senderId;
        const message = { role: 'user', content: incomingMessage.message };

        // Save the chatId for this conversation if it's the first message
        if (incomingMessage.chatId && !chatIds[senderId]) {
          setChatIds((prevChatIds) => ({ ...prevChatIds, [senderId]: incomingMessage.chatId }));
        }

        setChatMessages((prevChatMessages) => {
          const prevMessages = prevChatMessages[senderId] || [];
          return { ...prevChatMessages, [senderId]: [...prevMessages, message] };
        });

        setChats((prevChats) => {
          const existingChat = prevChats.find((chat) => chat.chatID === senderId);
          if (!existingChat) {
            return [...prevChats, { chatID: senderId, userName: incomingMessage.userName || 'User' }];
          }
          return prevChats;
        });

        // Send the employee's name when the user sends their name and opens a new chat
        if (incomingMessage.userName) {
          sendEmployeeName(incomingMessage.senderId, userInfo.attributes['given_name']);
        }
      }
    };

    ws.onerror = (error) => {
      //error('WebSocket error observed:', error);
    };

    ws.onclose = async (event) => {
      setIsConnected(false);
      setSocket(null);
      await setEmployeeAvailability(false, userInfo.attributes.sub, connectionId || '');
    };

    setSocket(ws);
  };

  const sendEmployeeName = (recipientConnectionId, employeeName) => {
    if (socket && isConnected) {
      const payload = {
        action: 'sendMessage',
        recipientConnectionId,
        message: `Hello, I'm ${employeeName}, how can I help you today?`,
        employeeName: employeeName,
        chatId: chatIds[recipientConnectionId] // Attach the chat ID here
      };
      socket.send(JSON.stringify(payload));
    }
  };

  const disconnectWebSocket = () => {
    if (socket) {
      socket.close();
      setWantsToConnect(false);
      setIsConnected(false);
      setSocket(null);
    }
  };

  const setEmployeeAvailability = async (isAvailable, employeeId, connectionId) => {
    const payload = {
      employeeId,
      connectionId: connectionId || '',
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
    } catch (error) {
      //console.error(error.message);
    }
  };

  const selectChat = (chatID) => {
    setActiveChat(chatID);
  };

  const sendMessage = () => {
    if (employeeMessage.trim() === '' || !activeChat || !socket) return;
    const payload = {
      action: 'sendMessage',
      recipientConnectionId: activeChat,
      message: employeeMessage,
      userName: user.attributes.given_name,
      liveChatId: "61d30741-0bda-4d0d-89ce-d6c5f64b6267" // NOG FIXEN
    };

    socket.send(JSON.stringify(payload));

    const newMessage = { role: 'employee', content: employeeMessage };
    setChatMessages((prevChatMessages) => ({
      ...prevChatMessages,
      [activeChat]: [...(prevChatMessages[activeChat] || []), newMessage],
    }));

    setEmployeeMessage('');
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
