import React, { useState, useEffect } from 'react';
import './hostchatbot.css';
import { Auth } from 'aws-amplify';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../UserContext';
import stringSimilarity from 'string-similarity';
import AccommodationTile from '../hostchatbot/AccommodationTile';
import axios from 'axios';

const HostChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingUserChoice, setAwaitingUserChoice] = useState(true);
  const [currentOption, setCurrentOption] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [username, setUserName] = useState(null);
  const [accommodations, setAccommodations] = useState([]);
  const [faqList, setFaqList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { role, isLoading: userLoading } = useUser();
  const location = useLocation();

  useEffect(() => {
    const setUserDetails = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        setUserId(userInfo.attributes.sub);
        const name = userInfo.attributes['custom:username'] || 'Host';
        setUserName(name);
        setMessages([{ text: `Hello, ${name}! Please choose an option:`, sender: 'bot', contentType: 'text' }]);
        setAwaitingUserChoice(true);
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    setUserDetails();
  }, []);

  useEffect(() => {
    if (!userLoading && role === 'Host') {
      const chatOpened = sessionStorage.getItem('chatOpened');
      if (!chatOpened && location.pathname === '/hostdashboard') {
        setIsChatOpen(true);
        sessionStorage.setItem('chatOpened', 'true');
      }
    }
  }, [userLoading, role, location]);

  const goBackToOptions = () => {
    setAwaitingUserChoice(true);
    setSuggestions([]);
    setCurrentOption(null);
    setAccommodations([]);
    setMessages([{ text: `Hello again, ${username}! Please choose an option:`, sender: 'bot', contentType: 'text' }]);
  };

  const handleButtonClick = (choice) => {
    setAwaitingUserChoice(false);
    setCurrentOption(choice);
    handleUserChoice(choice);
  };

  const handleUserChoice = (choice) => {
    let newMessage = '';
    switch (choice) {
      case '1':
        newMessage = 'You can ask me about accommodations. Here are some suggestions:';
        setSuggestions(['List my accommodation', 'Show all accommodations']);
        break;
      case '2':
        newMessage = 'You can ask me about Domits. Here are some suggestions:';
        setSuggestions(['Is Domits 100% free for hosts']);
        break;
      case '3':
        newMessage = 'You can contact an expert at support@domits.com or call +123456789.';
        setSuggestions([]);
        break;
      default:
        newMessage = 'Please choose a valid option (1, 2, or 3).';
        setSuggestions([]);
        setAwaitingUserChoice(true);
    }

    setMessages((prevMessages) => [
      ...prevMessages.filter((message) => message.text !== `Hello again, ${username}! Please choose an option:`),
      { text: newMessage, sender: 'bot', contentType: 'text' },
    ]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (userInput.trim()) {
      console.log('User input:', userInput); // Log the user input
      const newMessages = [...messages, { text: userInput, sender: 'user', contentType: 'text' }];
      setMessages(newMessages);
      setUserInput('');

      if (currentOption === '1') {
        handleAccommodationQuery(userInput);
      } else if (currentOption === '2') {
        handleFAQQuery(userInput);
      } else {
        handleExpertContact();
      }
    }
  };

  // GPT-3.5 Turbo implementation for handling accommodation queries with logs and checks
  const handleAccommodationQuery = async (userInput) => {
    if (accommodations.length === 0) {
      console.warn('No accommodation data available. Fetching data might still be in progress.');
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: "Sorry, there is no accommodation data available right now.", sender: 'bot', contentType: 'text' },
      ]);
      return;
    }

    setLoading(true);
    try {
      // Log the accommodation data
      console.log('Accommodation data passed to GPT:', accommodations);

      // Convert the accommodation data into a human-readable format for GPT-3.5 Turbo
      const contextData = accommodations.map((acc) => ({
        title: acc.title || 'Accommodation',
        city: acc.city || 'Not specified',
        country: acc.country || 'Not specified',
        bathrooms: acc.bathrooms || 'Not specified',
        guestAmount: acc.guestAmount || 'Not specified',
      }));

      const prompt = `
      You are an AI assistant that helps users with accommodation-related queries. Answer the user's questions based only on the provided accommodation data.

      Accommodation Details:
      ${contextData.map((acc) => `
        Title: ${acc.title}
        City: ${acc.city}
        Country: ${acc.country}
        Bathrooms: ${acc.bathrooms}
        Guest Capacity: ${acc.guestAmount}
      `).join('\n\n')}
      
      User Input: "${userInput}"
      
      Answer based only on the provided data. If the user asks to filter by country or guest rooms, respond with the relevant filtered data.
    `;

      console.log('Prompt sent to GPT-3.5 Turbo:', prompt);

      const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that provides answers based on accommodation data.' },
              { role: 'user', content: prompt },
            ],
            max_tokens: 250,
            temperature: 0.7,
            n: 1,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`,
            },
          });

      const gptResponse = response.data.choices[0].message.content.trim();
      console.log('GPT-3.5 Turbo response:', gptResponse);

      // Display the GPT-3.5 Turbo response in the chatbot
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: gptResponse, sender: 'bot', contentType: 'text' },
      ]);
    } catch (error) {
      console.error('Error with GPT-3.5 Turbo API:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: "Sorry, I couldn't process your request at the moment.", sender: 'bot', contentType: 'text' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFAQQuery = (userInput) => {
    if (faqList.length === 0) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: "Sorry, I don't have any FAQs available at the moment.", sender: 'bot', contentType: 'text' },
      ]);
      return;
    }

    const faqQuestions = faqList.map((faq) => faq.question.toLowerCase());
    const bestMatch = stringSimilarity.findBestMatch(userInput.toLowerCase(), faqQuestions);

    if (bestMatch.bestMatch.rating > 0.5) {
      const matchedFAQ = faqList[bestMatch.bestMatchIndex];
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          text: (
              <div className="faq-layout">
                <p className="faq-question">Q: {matchedFAQ.question}</p>
                <p className="faq-answer">A: {matchedFAQ.answer}</p>
              </div>
          ),
          sender: 'bot',
          contentType: 'faq',
        },
      ]);
    } else {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: "Sorry, I couldn't find an answer to your question.", sender: 'bot', contentType: 'text' },
      ]);
    }
  };

  const handleExpertContact = () => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { text: 'You can contact an expert at support@domits.com or call +123456789.', sender: 'bot', contentType: 'text' },
    ]);
  };

  const fetchAccommodations = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await fetch(
          'https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation',
          {
            method: 'POST',
            body: JSON.stringify({ OwnerId: userId }),
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
          }
      );
      const data = await response.json();
      const accommodationsArray = data.body ? JSON.parse(data.body) : [];

      console.log('Fetched accommodations:', accommodationsArray); // Log fetched accommodations

      const formattedAccommodations = accommodationsArray.map((acc) => ({
        id: acc.ID,
        title: acc.Title || 'Accommodation',
        city: acc.City,
        bathrooms: acc.Bathrooms,
        guestAmount: acc.GuestAmount,
        images: acc.Images || {},
      }));

      setAccommodations(formattedAccommodations);
      console.log('Accommodations saved in state:', formattedAccommodations); // Log the formatted accommodations
    } catch (error) {
      console.error('Error fetching accommodations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAccommodations = async () => {
    try {
      const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/ReadAccommodation');
      const responseData = await response.json();
      const data = JSON.parse(responseData.body);

      console.log('Fetched all accommodations:', data); // Log all accommodations fetched

      const formattedAccommodations = data.map((acc) => ({
        id: acc.ID,
        title: acc.Title || 'Accommodation',
        city: acc.City,
        bathrooms: acc.Bathrooms,
        guestAmount: acc.GuestAmount,
        images: acc.Images || {},
      }));

      setAccommodations(formattedAccommodations);
      if (currentOption === '1') {
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: 'Here is all available accommodation data:', sender: 'bot', contentType: 'accommodation' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching all accommodations:', error);
    }
  };

  const fetchFAQ = async () => {
    try {
      const response = await fetch('https://vs3lm9q7e9.execute-api.eu-north-1.amazonaws.com/default/readFAQ', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const responseData = await response.json();
      const faqData = JSON.parse(responseData.body);
      setFaqList(faqData);

      console.log('Fetched FAQ data:', faqData); // Log FAQ data
    } catch (error) {
      console.error('Error fetching FAQ data:', error);
    }
  };

  useEffect(() => {
    fetchFAQ();
  }, []);

  const toggleChat = () => setIsChatOpen(!isChatOpen);

  if (isLoading || userLoading || role !== 'Host') return null;

  return (
      <>
        <button className="hostchatbot-toggle-button" onClick={toggleChat}>
          💬
        </button>

        <div className={`hostchatbot-container ${isChatOpen ? 'open' : ''}`}>
          <div className="hostchatbot-header">
            <span>Chat with us</span>
            <button className="hostchatbot-close-button" onClick={toggleChat}>
              ✖
            </button>
          </div>
          <div className="hostchatbot-window">
            {messages.map((message, index) => (
                <div
                    key={index}
                    className={`hostchatbot-message ${
                        message.contentType === 'accommodation'
                            ? 'accommodation-layout'
                            : message.contentType === 'faq'
                                ? 'faq-layout'
                                : message.sender
                    }`}
                >
                  <p>{message.text}</p>
                </div>
            ))}
            {accommodations.length > 0 && (
                <div className="hostchatbot-accommodations">
                  {accommodations.map((accommodation, index) => (
                      <AccommodationTile key={index} accommodation={accommodation} />
                  ))}
                </div>
            )}
            {awaitingUserChoice && (
                <div className="hostchatbot-option-buttons">
                  <button onClick={() => handleButtonClick('1')}>1. I have a question regarding accommodations</button>
                  <button onClick={() => handleButtonClick('2')}>2. I want to learn about Domits</button>
                  <button onClick={() => handleButtonClick('3')}>3. Connect me with an expert</button>
                </div>
            )}
            {suggestions.length > 0 && (
                <div className="hostchatbot-suggestions">
                  <p>Suggestions:</p>
                  {suggestions.map((suggestion, index) => (
                      <p key={index} className="hostchatbot-suggestion">
                        {suggestion}
                      </p>
                  ))}
                </div>
            )}
            {loading && <div className="hostchatbot-message bot">Loading...</div>}
            {!awaitingUserChoice && (
                <button className="hostchatbot-go-back-button" onClick={goBackToOptions}>
                  Go Back
                </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="hostchatbot-input">
            <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type a message..."
                disabled={loading || awaitingUserChoice}
            />
            <button type="submit" disabled={loading || awaitingUserChoice}>
              Send
            </button>
          </form>
        </div>
      </>
  );
};

export default HostChatbot;
