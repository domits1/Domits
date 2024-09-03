import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './chatbot.css';
import { useUser } from '../../UserContext';

const Chat = () => {
  const { user, isLoading } = useUser();
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatID, setChatID] = useState(localStorage.getItem('chatID') || null);
  const [predefinedMessagesVisible, setPredefinedMessagesVisible] = useState(true);
  const [subQuestions, setSubQuestions] = useState([]);
  const [currentLayer, setCurrentLayer] = useState('main');
  const [subSubQuestions, setSubSubQuestions] = useState([]);
  const chatMessagesRef = useRef(null);

  const predefinedMessages = [
    "Inspire Me Where to Go",
    "I Need Customer Support",
    "Plan My Trip",
    "I Want a Sunny Vacation",
    "I'm Traveling on a Budget",
    "I'm Planning a Family Vacation",
    "I'm Looking for a Unique Experience"
  ];

  const decisionTree = {
    "Inspire Me Where to Go": {
      main: [
        "Do you prefer cities or nature?",
        "What's your budget range?",
        "Are you looking for an adventure or relaxation?"
      ],
      "Do you prefer cities or nature?": [
        "Popular Destinations",
        "Personalized Recommendations",
        "Special Interests"
      ],
      "What's your budget range?": [
        "Popular Destinations",
        "Personalized Recommendations",
        "Special Interests"
      ],
      "Are you looking for an adventure or relaxation?": [
        "Popular Destinations",
        "Personalized Recommendations",
        "Special Interests"
      ],
      "Popular Destinations": [
        "What are the top trending destinations right now?",
        "Can you suggest a hidden gem destination?",
        "Show me the best places to visit this season."
      ],
      "Personalized Recommendations": [
        "Suggest a destination based on my budget.",
        "Where should I go if I love nature/adventure/culture?",
        "Recommend a place based on my previous travels."
      ],
      "Special Interests": [
        "Where can I go for the best food experiences?",
        "Suggest destinations for a romantic getaway.",
        "Where should I go for an unforgettable wildlife experience?"
      ]
    },
    "I Need Customer Support": {
      main: [
        "Booking Issues",
        "Payment Problems",
        "General Inquiries"
      ],
      "Booking Issues": [
        "I need help with my booking confirmation.",
        "How can I modify or cancel my reservation?",
        "I haven’t received my booking details. What should I do?"
      ],
      "Payment Problems": [
        "My payment didn’t go through. Can you assist?",
        "How can I get a refund?",
        "What are the accepted payment methods?"
      ],
      "General Inquiries": [
        "How do I contact customer service directly?",
        "What is your cancellation policy?",
        "Can you explain the terms and conditions of my booking?"
      ]
    },
    "Plan My Trip": {
      main: [
        "Travel Itinerary",
        "Transportation",
        "Packing and Preparation"
      ],
      "Travel Itinerary": [
        "Help me create an itinerary for my trip.",
        "What are the must-see attractions in [Destination]?",
        "Can you suggest a day trip from [Destination]?"
      ],
      "Transportation": [
        "What are the best ways to travel within [Destination]?",
        "How can I get from the airport to my accommodation?",
        "Should I rent a car, or is public transport better?"
      ],
      "Packing and Preparation": [
        "What should I pack for a trip to [Destination]?",
        "What travel documents do I need for [Destination]?",
        "Are there any travel advisories for [Destination]?"
      ]
    },
    "I Want a Sunny Vacation": {
      main: [
        "Beach Destinations",
        "Warm Weather Activities",
        "Tropical Getaways"
      ],
      "Beach Destinations": [
        "Where are the best beaches for relaxation?",
        "Can you recommend a family-friendly beach resort?",
        "What are the best beaches with water sports?"
      ],
      "Warm Weather Activities": [
        "Suggest outdoor activities for a sunny vacation.",
        "Where can I find the best snorkeling/diving spots?",
        "Recommend sunny destinations with cultural attractions."
      ],
      "Tropical Getaways": [
        "What are the best tropical islands to visit?",
        "Can you suggest luxury resorts in warm destinations?",
        "Where should I go for a budget-friendly beach vacation?"
      ]
    },
    "I'm Traveling on a Budget": {
      main: [
        "Budget-Friendly Destinations",
        "Accommodation Options",
        "Money-Saving Tips"
      ],
      "Budget-Friendly Destinations": [
        "Where can I go for a cheap but amazing vacation?",
        "Suggest budget-friendly European/Asian/American destinations.",
        "What are the best off-season travel deals?"
      ],
      "Accommodation Options": [
        "Can you recommend affordable hotels/hostels?",
        "What are the best tips for finding cheap flights?",
        "How can I save money on accommodation?"
      ],
      "Money-Saving Tips": [
        "How can I travel on a budget?",
        "What are the best ways to save money on food while traveling?",
        "Can you suggest free or low-cost activities in [Destination]?"
      ]
    },
    "I'm Planning a Family Vacation": {
      main: [
        "Family-Friendly Destinations",
        "Travel with Kids",
        "Safety and Comfort"
      ],
      "Family-Friendly Destinations": [
        "Where are the best places for a family vacation?",
        "Can you suggest a kid-friendly resort?",
        "What are the best family-friendly attractions in [Destination]?"
      ],
      "Travel with Kids": [
        "How can I keep my kids entertained on a long flight?",
        "What should I pack for traveling with children?",
        "Can you recommend child-friendly restaurants in [Destination]?"
      ],
      "Safety and Comfort": [
        "What are the safest destinations for families?",
        "How can I ensure a smooth travel experience with kids?",
        "What are the best family travel tips?"
      ]
    },
    "I'm Looking for a Unique Experience": {
      main: [
        "Adventure Travel",
        "Cultural Experiences",
        "Unusual Accommodations"
      ],
      "Adventure Travel": [
        "Where can I go for an adrenaline-filled vacation?",
        "Can you suggest unique outdoor activities in [Destination]?",
        "What are the best places for hiking/trekking?"
      ],
      "Cultural Experiences": [
        "Recommend destinations with rich cultural heritage.",
        "What are the best cultural festivals to attend?",
        "Where can I learn about traditional crafts or local cuisine?"
      ],
      "Unusual Accommodations": [
        "Can you suggest unique places to stay (treehouses, igloos, etc.)?",
        "What are the most unusual accommodations around the world?",
        "Where can I stay for a truly off-the-grid experience?"
      ]
    }
  };

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

  const sendMessage = async (message = userInput) => {
    if (message.trim() === '') return;

    setMessages((prevMessages) => [
      ...prevMessages,
      { text: message, sender: 'user' }
    ]);

    if (currentLayer === 'main' && decisionTree[message]) {
      setSubQuestions(decisionTree[message].main);
      setCurrentLayer(message);
      setPredefinedMessagesVisible(false);
      setSubSubQuestions([]);
    } else if (decisionTree[currentLayer] && decisionTree[currentLayer][message]) {
      if (Object.values(decisionTree[currentLayer]).flat().includes(message)) {
        setSubSubQuestions(decisionTree[currentLayer][message]);
      }
      setSubQuestions([]);
      setCurrentLayer(message);
    } else {
      setPredefinedMessagesVisible(false);
      setSubQuestions([]);
      setSubSubQuestions([]);
      setCurrentLayer('main');
    }

    scrollToBottom();

    const tempUserInput = message;
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
      const { message: aiMessage, accommodations } = response.data;
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: aiMessage, sender: 'ai', accommodations: accommodations }
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

        {predefinedMessagesVisible && currentLayer === 'main' && (
          <div className="predefined-messages">
            {predefinedMessages.map((message, index) => (
              <button 
                key={index} 
                className="predefined-message-button" 
                onClick={() => sendMessage(message)}
                disabled={loading}
              >
                {message}
              </button>
            ))}
          </div>
        )}

        {subQuestions.length > 0 && (
          <div className="sub-questions">
            {subQuestions.map((question, index) => (
              <button 
                key={index} 
                className="sub-question-button" 
                onClick={() => sendMessage(question)}
                disabled={loading}
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {subSubQuestions.length > 0 && (
          <div className="sub-sub-questions">
            {subSubQuestions.map((question, index) => (
              <button 
                key={index} 
                className="sub-sub-question-button" 
                onClick={() => sendMessage(question)}
                disabled={loading}
              >
                {question}
              </button>
            ))}
          </div>
        )}

        <div className="chat-input">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyUp={(e) => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="Type a message..."
            disabled={loading}
          />
          <button onClick={() => sendMessage()} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
