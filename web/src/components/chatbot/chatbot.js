import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './chatbot.css';
import { useUser } from '../../UserContext';

const Chat = () => {
  const { user, role, isLoading } = useUser();
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatMessagesRef = useRef(null);

  useEffect(() => {
    // Check if user is not authenticated, you can handle redirection or show a message here
    if (!isLoading && !user) {
      console.log('User not authenticated');
    }
  }, [isLoading, user]);

  const scrollToBottom = () => {
    const chatMessages = chatMessagesRef.current;
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
      const response = await axios.post('http://13.53.187.20:3000/query ', { query: tempUserInput });
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
    <div className='chat-center'>
      <div className="chat-container">
        <div className="chat-messages" ref={chatMessagesRef}>
          {messages.map((message, index) => (
            <div key={index} className={`chat-message ${message.sender}`}>
              <div className="chat-sender">
                {message.sender === 'user' ? 'You' : 'Sophia (AI)'}
              </div>
              {message.sender !== 'typing' ? (
                <div className="chat-message-content">
                  {message.text}
                </div>
              ) : (
                <div className="chat-typing-indicator">
                  {message.text}
                  <span className="chat-dot">.</span>
                  <span className="chat-dot">.</span>
                  <span className="chat-dot">.</span>
                </div>
              )}
              {message.sender === 'ai' && message.accommodations && (
                <div className="chat-accommodation-tiles">
                  {message.accommodations.map(accommodation => (
                    <div key={accommodation.ID} className="chat-accommodation-tile">
                      <img
                        src={accommodation.Images.image1}
                        alt="Accommodation Image"
                        className="chat-accommodation-image"
                      />
                      <div className="chat-accommodation-details">
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