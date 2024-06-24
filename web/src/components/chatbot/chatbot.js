import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './chatbot.css'; // Ensure you have the CSS file
import { useUser } from '../../UserContext'; // Make sure this path is correct

const Chat = () => {
  const { user, isLoading } = useUser();
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatID, setChatID] = useState(localStorage.getItem('chatID') || null);
  const chatMessagesRef = useRef(null);

  useEffect(() => {
    if (!isLoading) {
      if (chatID || user) {
        loadChatHistory();
      }
    }
  }, [isLoading, chatID, user]);

  const scrollToBottom = () => {
    const chatMessages = chatMessagesRef.current;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const loadChatHistory = async () => {
    try {
      const params = chatID ? { chatID } : { userID: user.id };
      const response = await axios.get('http://localhost:3001/chat-history', { params });
      if (response.data.messages) {
        setMessages(response.data.messages.map(msg => ({
          text: msg.content,
          sender: msg.role === 'user' ? 'user' : 'ai',
          accommodations: msg.accommodations || null
        })));
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (userInput.trim() === '') return;

    setMessages((prevMessages) => [
      ...prevMessages,
      { text: userInput, sender: 'user' }
    ]);
    scrollToBottom();

    const tempUserInput = userInput;
    setUserInput('');
    setLoading(true);

    const typingMessage = { text: 'Sophia (AI) is typing', sender: 'typing' };
    setMessages((prevMessages) => [
      ...prevMessages,
      typingMessage
    ]);
    scrollToBottom();

    try {
      const payload = { query: tempUserInput };
      if (chatID) {
        payload.chatID = chatID;
      } else if (user) {
        payload.userID = user.id;
      }

      const response = await axios.post('http://localhost:3001/query', payload);

      if (response.data.chatID && !chatID) {
        setChatID(response.data.chatID);
        localStorage.setItem('chatID', response.data.chatID);
      }

      setMessages((prevMessages) => prevMessages.filter(message => message.sender !== 'typing'));
      const { message, accommodations } = response.data;
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: message, sender: 'ai', accommodations: accommodations }
      ]);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prevMessages) => prevMessages.filter(message => message.sender !== 'typing'));
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="chat-center">
      <div className="chat-container">
        <div className="chat-messages" ref={chatMessagesRef}>
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}`}>
              <div className="sender">
                {message.sender === 'user' ? 'You' : 'Sophia (AI)'}
              </div>
              {message.sender !== 'typing' ? (
                <div className="message-content">{message.text}</div>
              ) : (
                <div className="typing-indicator">
                  {message.text}
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                </div>
              )}
              {message.sender === 'ai' && message.accommodations && (
                <div className="accommodation-tiles">
                  {message.accommodations.map(accommodation => (
                    <div key={accommodation.ID} className="accommodation-tile">
                      <img src={accommodation.Images.image1} alt="Accommodation" className="accommodation-image" />
                      <div className="accommodation-details">
                        <h3>{accommodation.Title}</h3>
                        <p>{accommodation.Description}</p>
                        <p><strong>City:</strong> {accommodation.City}</p>
                        <p><strong>Bathrooms:</strong> {accommodation.Bathrooms}</p>
                        <p><strong>Guest Amount:</strong> {accommodation.GuestAmount}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyUp={(e) => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="Type a message..."
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
