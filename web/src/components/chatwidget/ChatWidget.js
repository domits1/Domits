import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { ResizableBox } from 'react-resizable';
import './ChatWidget.css';
import { useUser } from '../../UserContext';
import Slider from 'react-slick';

const ChatWidget = () => {
  const { user, isLoading } = useUser();
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatID, setChatID] = useState(localStorage.getItem('chatID') || null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAIChat, setIsAIChat] = useState(true);
  const [employeeConnectionId, setEmployeeConnectionId] = useState(null);
  const [employeeName, setEmployeeName] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [showHumanDecision, setShowHumanDecision] = useState(false);
  const [showConsentDecision, setShowConsentDecision] = useState(false);
  const chatMessagesRef = useRef(null);
  const [liveChatId, setLiveChatId] = useState(null);
  const [userName, setUserName] = useState('');
  const [nameEntered, setNameEntered] = useState(false);

  useEffect(() => {
    if (!isLoading && (chatID || user)) {
      if(user){
        setUserName(user.given_name);
        setNameEntered(true);
      }
      else if(localStorage.getItem('userName')){
        setNameEntered(true);
        setUserName(localStorage.getItem('userName'))
      }
      loadChatHistory();
    } else if (!isLoading && nameEntered) {
      sendWelcomeMessage();
    }
  }, [isLoading, chatID, user, nameEntered]);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const loadChatHistory = async () => {
    try {
      const sanitizedChatID = chatID?.replace(/^CHAT#/, '');
      const params = user ? { chatID: user.username } : { chatID: sanitizedChatID };
      
      const response = await axios.get('https://clmba23cj1.execute-api.eu-north-1.amazonaws.com/default/uChatbotFetchChatHistory', { params });
      
      if (response.data.messages) {
        const updatedMessages = await Promise.all(response.data.messages.map(async (msg) => {
          if (msg.role === "function" && Array.isArray(JSON.parse(msg.content))) {
            const accommodationIds = JSON.parse(msg.content);
            
            const accommodations = await Promise.all(
              accommodationIds.map(async (id) => {
                const { data } = await axios.post(
                  'https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation',
                  { ID: id }
                );
                return JSON.parse(data.body); // Parse the body to get the accommodation object
              })
            );
  
            return {
              text: "Here are your accommodations:",
              sender: "ai",
              accommodations
            };
          } else {
            return {
              text: msg.content,
              sender: msg.role === 'user' ? 'user' : 'ai',
              accommodations: null
            };
          }
        }));
  
        setMessages(updatedMessages);
      }
    } catch (error) {
      //console.error('Error loading chat history:', error);
    }
  };
  


  const handleTileClick = (id) => {
    const url = `${window.location.origin}/listingdetails?ID=${id}`;
    window.location.href = url;
  };

  const sendWelcomeMessage = () => {
    const welcomeMessage = "Hi! I am Sophia, your AI assistant. How can I assist you today?";
    setMessages(prevMessages => [...prevMessages, { text: welcomeMessage, sender: 'ai' }]);
  };

  const sendMessage = async () => {
    let message = userInput.trim();
    if (!message) return;

    if (isAIChat) {
      setMessages(prevMessages => [...prevMessages, { text: message, sender: 'user' }]);
    }

    setUserInput('');
    setMessageCount(prevCount => prevCount + 1);
    //setLoading(true);

    if (isAIChat) {
      setLoading(true);
      handleAIResponse(message);
    } else if (employeeConnectionId) {
      sendMessageToEmployee(message);
    }
  };

  const handleAIResponse = async (message) => {
    const typingMessage = { text: 'Sophia (AI) is typing...', sender: 'typing' };
    setMessages(prevMessages => [...prevMessages, typingMessage]);

    try {
      const payload = { query: message };
      if (user) {
        const userChatID = "CHAT#" + user.username;
        payload.chatID = userChatID;
      }
      else if(chatID){
        payload.chatID = chatID;
      }

      const response = await axios.post('https://j0ci7xg9di.execute-api.eu-north-1.amazonaws.com/default/uChatbotQueryChatGPT', payload);

      if (response.data.chatID && !chatID) {
        setChatID(response.data.chatID);
        localStorage.setItem('chatID', response.data.chatID);
      }

      setMessages(prevMessages => prevMessages.filter(msg => msg.sender !== 'typing'));

      const { message: aiMessage, accommodations } = response.data;
      setMessages(prevMessages => [
        ...prevMessages,
        { text: aiMessage || '', sender: 'ai', accommodations }
      ]);

      if (messageCount + 1 >= 5) setShowHumanDecision(true);
    } catch (error) {
      //console.error('Error sending message:', error);
      setMessages(prevMessages => prevMessages.filter(msg => msg.sender !== 'typing'));
    } finally {
      setLoading(false);
    }
  };

  const handleUserDecision = (decision) => {
    setShowHumanDecision(false);
    setMessageCount(0);

    if (decision === 'human') {
      setMessages(prevMessages => [...prevMessages, { text: 'Connecting to a human...', sender: 'system' }]);
      setShowConsentDecision(true);
    } else {
      setMessages(prevMessages => [...prevMessages, { text: 'Continuing with Sophia (AI).', sender: 'system' }]);
    }
  };

  const handleConsentDecision = async (consent) => {
    setShowConsentDecision(false);

    if (consent === 'yes') {
      await connectToEmployee();
    } else {
      setMessages(prevMessages => [...prevMessages, { text: "You chose not to connect to a human.", sender: "system" }]);
      setIsAIChat(true);
    }
  };

  const connectToEmployee = async () => {
    try {
      const response = await fetch('https://1qvev42qe9.execute-api.eu-north-1.amazonaws.com/default/eChatFindEmployee');
      const responseData = await response.json();
      const data = JSON.parse(responseData.body);
      await generateLiveChatId();

      if (data.connectionId) {
        setEmployeeConnectionId(data.connectionId);
        setIsAIChat(false);
        setMessages(prevMessages => [...prevMessages, { text: 'Connecting you to an agent...', sender: 'system' }]);

        const ws = new WebSocket(`wss://0e39mc46j0.execute-api.eu-north-1.amazonaws.com/production/?userId=${user?.id || 'anon'}&userName=${user?.attributes?.given_name || userName}`);
        
        ws.onopen = () => {
          setIsConnected(true);
          setSocket(ws);
        };

        ws.onmessage = (event) => {
          const incomingMessage = JSON.parse(event.data);
          //console.log(incomingMessage)
          if (!employeeName && incomingMessage.userName){
            //console.log(incomingMessage.userName)
            setEmployeeName(incomingMessage.userName);
          } 

          setMessages(prevMessages => [
            ...prevMessages,
            { text: incomingMessage.message, sender: 'employee' }
          ]);
        };

        ws.onclose = () => {
          setIsConnected(false);
          setMessageCount(0);
        };
      } else {
        setMessages(prevMessages => [
          ...prevMessages,
          { text: 'No agents are available right now. Please continue with the AI.', sender: 'system' }
        ]);
        setIsAIChat(true);
      }

    } catch (err) {
      //console.error('Failed to connect to employee:', err);
      setMessages(prevMessages => [
        ...prevMessages,
        { text: 'Failed to connect to an agent.', sender: 'system' }
      ]);
      setIsAIChat(true);
    }
  };

  const switchBackToAI = () => {
    setIsAIChat(true);
    setEmployeeConnectionId(null);
    setMessages(prevMessages => [
      ...prevMessages,
      { text: 'You have switched back to Sophia (AI).', sender: 'system' }
    ]);
    if (socket) socket.close();
  };

  const sendMessageToEmployee = (message) => {
    if (socket && isConnected && liveChatId) {
      const payload = {
        action: 'sendMessage',
        recipientConnectionId: employeeConnectionId,
        message: message,
        userName: userName,
        liveChatId: liveChatId 
      };
      //console.log("Sending message:", payload);
      socket.send(JSON.stringify(payload));
    } else {
      //console.log("Not sending message", { socket, isConnected, liveChatId });
    }
    setMessages(prevMessages => [...prevMessages, { text: message, sender: 'user' }]);
  };

  const handleNameSubmit = () => {
    if (userName.trim() !== '') {
      setNameEntered(true);
      localStorage.setItem('userName', userName);
    }
  };

  const generateLiveChatId = async () => {
    if (!liveChatId) {
      try {
        const response = await axios.get('https://5kitr1osz7.execute-api.eu-north-1.amazonaws.com/default/eChatGenerateChatID');
        const data = JSON.parse(response.data.body);

        if (data.liveChatId) {
          //console.log("Generated liveChatId:", data.liveChatId);
          setLiveChatId(data.liveChatId);
        } else {
          //console.warn("No liveChatId found in response data:", data);
        }
        
      } catch (error) {
        //console.error("Error generating liveChatId:", error);
      }
    }
  };

  return (
    <div className={`chatwidget-widget ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <button className="chatwidget-toggle" onClick={() => setIsOpen(true)}>
          &#128172;
        </button>
      )}
      {isOpen && (
        <ResizableBox width={400} height={600} minConstraints={[200, 200]} maxConstraints={[500, 600]} className="chatwidget-resizable">
          <div className="chatwidget-header">
            <span className="chatwidget-title">Chat</span>
            <button className="chatwidget-close" onClick={() => setIsOpen(false)}>×</button>
          </div>

          {/* New section to display chat partner and button to switch back to AI */}
          <div className="chatwidget-partner-indicator">
            {isAIChat ? (
              <span>Chatting with: <strong>Sophia (AI)</strong></span>
            ) : (
              <div>
                <span>Chatting with: <strong>{employeeName + " (Employee) " || 'Employee'}</strong></span>
                <button className="chatwidget-switch-to-ai" onClick={switchBackToAI}>
                  Switch to AI
                </button>
              </div>
            )}
          </div>

          {!user && !nameEntered && (
            <div className="chatwidget-name-input">
              <p>Please enter your name to start the chat:</p>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
              />
              <button onClick={handleNameSubmit}>Start Chat</button>
            </div>
          )}

          {nameEntered && (
            <div className="chatwidget-container">
              <div className="chatwidget-messages" ref={chatMessagesRef}>
                {messages.map((message, index) => (
                  <div className={`chatwidget-message ${message.sender}`} key={index}>
                    <div className="chatwidget-sender">
                      {message.sender === 'user'
                        ? 'You'
                        : message.sender === 'ai'
                        ? 'Sophia (AI)'
                        : message.sender === 'employee'
                        ? employeeName + " (Employee)"|| 'Employee'
                        : 'System'}
                    </div>
                    <div className={`chatwidget-message-content ${message.sender}`}>
                      {typeof message.text === 'object' ? JSON.stringify(message.text) : message.text || 'Error: Invalid message format'}
                    </div>
                    {message.sender === 'ai' && message.accommodations && (
                      <div className="chatwidget-accommodation-tiles">
                        {message.accommodations.map((accommodation, idx) => (
                          <div key={idx} className="chatwidget-accommodation-tile">
                            <Slider dots={true} infinite={false} speed={500} slidesToShow={1} slidesToScroll={1} arrows={true} className="chatwidget-slider">
                              {Object.keys(accommodation.Images).map((key, index) => (
                                <div key={index}>
                                  <img src={accommodation.Images[key]} alt={`Slide ${index + 1}`} className="chatwidget-accommodation-image" />
                                </div>
                              ))}
                            </Slider>
                            <div className="chatwidget-accommodation-details" onClick={() => handleTileClick(accommodation.ID)} style={{ cursor: 'pointer' }}>
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

              {showHumanDecision && (
                <div className="chatwidget-decision-box">
                  <p>Continue with AI or connect to a human?</p>
                  <button onClick={() => handleUserDecision('human')}>Talk to Human</button>
                  <button onClick={() => handleUserDecision('ai')}>Continue with AI</button>
                </div>
              )}

              {showConsentDecision && (
                <div className="chatwidget-decision-box">
                  <p>Do you consent to saving messages for training purposes?</p>
                  <button onClick={() => handleConsentDecision('yes')}>Yes</button>
                  <button onClick={() => handleConsentDecision('no')}>No</button>
                </div>
              )}

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
          )}
        </ResizableBox>
      )}
    </div>
  );
};

export default ChatWidget;
