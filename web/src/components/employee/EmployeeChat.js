import React, { useState, useEffect } from 'react';
import './EmployeeChat.css';

const EmployeeChat = () => {
  const [chats, setChats] = useState([]); // Stores open chats
  const [activeChat, setActiveChat] = useState(null); // Tracks the active chat
  const [messages, setMessages] = useState([]); // Messages in the active chat
  const [employeeMessage, setEmployeeMessage] = useState(''); // Message typed by employee

  // Dummy chat data for testing
  const dummyChats = [
    { chatID: 'chat1', userName: 'John Doe' },
    { chatID: 'chat2', userName: 'Jane Smith' },
    { chatID: 'chat3', userName: 'Alice Johnson' },
  ];

  const dummyMessages = {
    chat1: [
      { role: 'user', content: 'Hi, I need help with my booking.' },
      { role: 'employee', content: 'Sure, I can help you with that.' },
    ],
    chat2: [
      { role: 'user', content: 'What is the refund policy?' },
      { role: 'employee', content: 'You can get a refund within 30 days.' },
    ],
    chat3: [
      { role: 'user', content: 'I’m having trouble accessing my account.' },
      { role: 'employee', content: 'Please reset your password.' },
    ],
  };

  // Fetch open chats when the component loads (use dummy data for now)
  useEffect(() => {
    setChats(dummyChats);
  }, []);

  // Load messages when a chat is selected (use dummy data for now)
  const selectChat = (chatID) => {
    setActiveChat(chatID);
    setMessages(dummyMessages[chatID] || []); // Load dummy messages
  };

  // Send a message to the user (for testing purposes only)
  const sendMessage = () => {
    if (employeeMessage.trim() === '') return;

    setMessages((prevMessages) => [...prevMessages, { role: 'employee', content: employeeMessage }]);
    setEmployeeMessage(''); // Clear the input field
  };

  return (
    <div className="ec-employee-chat-container">
      <div className="ec-chat-box">
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
                {messages.map((message, index) => (
                  <div key={index} className={`ec-message-wrapper ${message.role}`}>
                    <span className="ec-sender-label">
                      {message.role === 'employee' ? 'You' : dummyChats.find((chat) => chat.chatID === activeChat).userName}
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
      </div>
    </div>
  );
};

export default EmployeeChat;
