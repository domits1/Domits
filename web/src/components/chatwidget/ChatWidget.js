import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ResizableBox } from 'react-resizable';
import './ChatWidget.css'; // Ensure you have the CSS file
import { useUser } from '../../UserContext'; // Make sure this path is correct

const ChatWidget = () => {
  const { user, isLoading } = useUser();
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatID, setChatID] = useState(localStorage.getItem('chatID') || null);
  const [isOpen, setIsOpen] = useState(false);
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
      const params = user ? { userID: user.attributes.sub } : { chatID };
      const response = await axios.get('https://djs95w5kug.execute-api.eu-north-1.amazonaws.com/default/chatWidgetHistory', { params });
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
      if (user) {
        payload.userID = user.attributes.sub;
      } else if (chatID) {
        payload.chatID = chatID;
      }

      const response = await axios.post('https://eja46okj64.execute-api.eu-north-1.amazonaws.com/default/chatWidgetQuery', payload);

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
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: 'Chatbot is currently unavailable. Please try again later.', sender: 'ai' }
      ]);
      scrollToBottom();
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={`chatwidget-widget ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <button className="chatwidget-toggle" onClick={() => setIsOpen(true)}>
          &#128172; {/* Unicode character for a chat bubble */}
        </button>
      )}
      {isOpen && (
        <ResizableBox
          width={500}
          height={600}
          minConstraints={[200, 200]}
          maxConstraints={[600, 600]}
          className="chatwidget-resizable"
          handle={<span className="chatwidget-resize-handle" />}
        >
          <div className="chatwidget-header">
            <span className="chatwidget-title">Chat</span>
            <button className="chatwidget-close" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="chatwidget-container">
            <div className="chatwidget-messages" ref={chatMessagesRef}>
              {messages.map((message, index) => (
                <div key={index} className={`chatwidget-message ${message.sender}`}>
                  <div className="chatwidget-sender">
                    {message.sender === 'user' ? 'You' : 'Sophia (AI)'}
                  </div>
                  {message.sender !== 'typing' ? (
                    <div className="chatwidget-message-content">{message.text}</div>
                  ) : (
                    <div className="chatwidget-typing-indicator">
                      {message.text}
                      <span className="chatwidget-dot">.</span>
                      <span className="chatwidget-dot">.</span>
                      <span className="chatwidget-dot">.</span>
                    </div>
                  )}
                  {message.sender === 'ai' && message.accommodations && (
                    <div className="chatwidget-accommodation-tiles">
                      {message.accommodations.map(accommodation => (
                        <div key={accommodation.ID} className="chatwidget-accommodation-tile">
                          <img src={accommodation.Images.image1} alt="Accommodation" className="chatwidget-accommodation-image" />
                          <div className="chatwidget-accommodation-details">
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
            <div className="chatwidget-input">
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
        </ResizableBox>
      )}
    </div>
  );
};

export default ChatWidget;
