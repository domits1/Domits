import React, { useState, useEffect } from 'react';
import axios from 'axios';
import stringSimilarity from 'string-similarity';
import './hostchatbot.css';
import { Auth } from 'aws-amplify';
import { useUser } from '../../UserContext';
import { useLocation } from 'react-router-dom';

const HostChatbot = () => {
  const [messages, setMessages] = useState([
    { text: 'Hello! How can I assist you today?', sender: 'bot', contentType: 'text' },
  ]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [accolist, setAccolist] = useState([]);
  const [allAccommodations, setAllAccommodations] = useState([]);
  const [faqList, setFaqList] = useState([]);
  const [awaitingFeedback, setAwaitingFeedback] = useState(false);
  const [awaitingCityConfirmation, setAwaitingCityConfirmation] = useState(null);
  const [userId, setUserId] = useState(null);
  const { role, isLoading } = useUser();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const location = useLocation();

  // Fetch user ID on component mount
  useEffect(() => {
    const setUserIdAsync = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        setUserId(userInfo.attributes.sub);
        console.log('User ID set:', userInfo.attributes.sub);
      } catch (error) {
        console.error('Error setting user id:', error);
      }
    };

    setUserIdAsync();
  }, []);

  // Open chat on first visit to host dashboard
  useEffect(() => {
    const chatOpened = sessionStorage.getItem('chatOpened');
    if (!isLoading && role === 'Host' && !chatOpened && location.pathname === '/hostdashboard') {
      setIsChatOpen(true);
      sessionStorage.setItem('chatOpened', 'true');
    }
  }, [isLoading, role, location]);

  // Fetch data when userId is available
  useEffect(() => {
    if (userId) {
      fetchAccommodations();
    }
    fetchAllAccommodations();
    fetchFAQ();
  }, [userId]);

  const handleUserInput = (e) => setUserInput(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (userInput.trim()) {
      const newMessages = [
        ...messages,
        { text: userInput, sender: 'user', contentType: 'text' },
      ];
      setMessages(newMessages);
      setUserInput('');

      if (awaitingCityConfirmation) {
        await handleCityConfirmation(userInput.toLowerCase(), newMessages);
      } else if (awaitingFeedback) {
        await handleUserFeedback(userInput.toLowerCase(), newMessages);
      } else {
        await processUserMessage(newMessages);
      }
    }
  };

  // Define function schemas for OpenAI function calling
  const functionSchemas = [
    {
      name: "getAccommodations",
      description: "Retrieve accommodations based on specified filters",
      parameters: {
        type: "object",
        properties: {
          Bathrooms: { type: "integer", description: "Number of bathrooms" },
          Country: { type: "string", description: "Country name" },
          GuestAmount: { type: "integer", description: "Number of guests" }
        },
        required: []
      }
    },
    {
      name: "getFAQ",
      description: "Retrieve a list of FAQs",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  ];

  // Function to check if the user message is asking an FAQ-related question
  const findFAQMatch = (userMessage) => {
    let matchedFAQ = null;
    const threshold = 0.5; // Similarity threshold

    faqList.forEach((faq) => {
      const similarity = stringSimilarity.compareTwoStrings(userMessage, faq.question.toLowerCase());
      if (similarity > threshold) {
        matchedFAQ = faq;
      }
    });

    return matchedFAQ;
  };

  // Updated processUserMessage to prioritize local data and fallback to OpenAI if necessary
  const processUserMessage = async (newMessages) => {
    const userMessage = newMessages[newMessages.length - 1].text.toLowerCase();

    // Check if the user is asking for an FAQ match
    const matchedFAQ = findFAQMatch(userMessage);

    if (matchedFAQ) {
      const faqResponse = `Q: ${matchedFAQ.question}\nA: ${matchedFAQ.answer}`;
      setMessages([...newMessages, { text: faqResponse, sender: 'bot', contentType: 'text' }]);
      return; // Early return, don't go to OpenAI
    }

    // Check if the user is asking to show accommodations
    if (userMessage.includes('show my accommodation') || userMessage.includes('list my accommodation')) {
      if (accolist && accolist.length > 0) {
        const formattedResponse = formatAccommodationsResponse(accolist);
        setMessages([...newMessages, { text: formattedResponse, sender: 'bot', contentType: 'text' }]);
        return; // Early return, don't go to OpenAI
      } else {
        setMessages([...newMessages, { text: "You don't have any accommodations listed.", sender: 'bot', contentType: 'text' }]);
        return; // Early return, don't go to OpenAI
      }
    }

    // If no local data handles the query, fallback to OpenAI
    fallbackToOpenAI(newMessages);
  };

  // Fallback to OpenAI only if no local data matches the query, using function calling
  const fallbackToOpenAI = async (newMessages) => {
    const userMessage = newMessages[newMessages.length - 1].text.toLowerCase();

    // Call OpenAI API with function calling enabled
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-0613', // Ensure you're using the correct model for function calling
        messages: [
          { role: 'system', content: 'You are a helpful assistant for finding accommodations and FAQs.' },
          { role: 'user', content: userMessage }
        ],
        functions: functionSchemas, // Include the function schemas for OpenAI
        function_call: 'auto' // Allow OpenAI to decide if and when to call a function
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_OPENAI_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const responseMessage = response.data.choices[0].message;

    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);

      // Handle function calling for "getAccommodations"
      if (functionName === "getAccommodations") {
        const accommodations = await getAccommodations(functionArgs);

        if (accommodations && accommodations.length > 0) {
          const formattedResponse = formatAccommodationsResponse(accommodations);
          setMessages([...newMessages, { text: formattedResponse, sender: 'bot', contentType: 'text' }]);
        } else {
          setMessages([...newMessages, { text: 'Sorry, no accommodations matched your query.', sender: 'bot', contentType: 'text' }]);
        }
      }
      // Handle function calling for "getFAQ"
      else if (functionName === "getFAQ") {
        const faqResponse = faqList.map((faq, index) => `Q${index + 1}: ${faq.question}\nA${index + 1}: ${faq.answer}`).join('\n\n');
        setMessages([...newMessages, { text: faqResponse, sender: 'bot', contentType: 'text' }]);
      }
    } else {
      setMessages([...newMessages, { text: responseMessage.content, sender: 'bot', contentType: 'text' }]);
    }
  };

  // Fetch accommodations from backend
  const getAccommodations = async (filters) => {
    try {
      const response = await fetch(
        'https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/ReadAccommodation',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filters)
        }
      );

      const data = await response.json();
      return data.body ? JSON.parse(data.body) : [];
    } catch (error) {
      console.error('Error fetching accommodations:', error);
      return [];
    }
  };

  // Format accommodations response
  const formatAccommodationsResponse = (accommodations) => {
    return accommodations.map(acc => (
      `Accommodation in ${acc.City} with ${acc.Bathrooms} bathrooms, suitable for ${acc.GuestAmount} guests.`
    )).join('\n');
  };

  const fetchFAQ = async () => {
    try {
      const response = await fetch(
        'https://vs3lm9q7e9.execute-api.eu-north-1.amazonaws.com/default/readFAQ',
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch FAQ data');
      }

      const responseData = await response.json();
      const faqData = JSON.parse(responseData.body);
      console.log('FAQ data:', faqData);

      setFaqList(faqData);
    } catch (error) {
      console.error('Error fetching FAQ data:', error);
    }
  };

  const fetchAllAccommodations = async () => {
    try {
      const response = await fetch(
        'https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/ReadAccommodation'
      );
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const responseData = await response.json();
      const data = JSON.parse(responseData.body);

      setAllAccommodations(data);
    } catch (error) {
      console.error('Error fetching or processing data:', error);
    }
  };

  const fetchAccommodations = async () => {
    setLoading(true);
    if (!userId) {
      return;
    } else {
      try {
        const response = await fetch(
          'https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation',
          {
            method: 'POST',
            body: JSON.stringify({ OwnerId: userId }),
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
          }
        );
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        const data = await response.json();
        if (data.body && typeof data.body === 'string') {
          const accommodationsArray = JSON.parse(data.body);
          if (Array.isArray(accommodationsArray)) {
            setAccolist(accommodationsArray);
          } else {
            setAccolist([]);
          }
        }
      } catch (error) {
        console.error('Unexpected error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleChat = () => setIsChatOpen(!isChatOpen);

  if (isLoading) return <div>Loading...</div>;

  if (role !== 'Host') return null;

  return (
    <>
      <button className="chatbot-toggle-button" onClick={toggleChat}>
        💬 Chat
      </button>

      <div className={`chatbot-container ${isChatOpen ? 'open' : ''}`}>
        <div className="chatbot-header">
          <span>Chat with us</span>
          <button className="close-button" onClick={toggleChat}>
            ✖
          </button>
        </div>
        <div className="chat-window">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}`}>
              {message.contentType === 'jsx' ? (
                message.text
              ) : (
                <p>{message.text}</p>
              )}
            </div>
          ))}
          {loading && <div className="message bot">AI is typing...</div>}
        </div>
        <form onSubmit={handleSubmit} className="chat-input">
          <input
            type="text"
            value={userInput}
            onChange={handleUserInput}
            placeholder="Type a message..."
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            Send
          </button>
        </form>
      </div>
    </>
  );
};

export default HostChatbot;
