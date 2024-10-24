import React, { useState, useEffect } from 'react';
import './hostchatbot.css';
import { Auth } from 'aws-amplify';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../UserContext';
import stringSimilarity from 'string-similarity';
import AccommodationTile from '../hostchatbot/AccommodationTile';

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

  const handleAccommodationQuery = (userInput) => {
    if (userInput.toLowerCase().includes('list')) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: 'Here is the list of your accommodations.', sender: 'bot', contentType: 'text' },
      ]);
      fetchAccommodations();
    } else if (userInput.toLowerCase().includes('show')) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: 'Here is all available accommodation data.', sender: 'bot', contentType: 'text' },
      ]);
      fetchAllAccommodations();
    } else {
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: "Sorry, I didn't understand your question about accommodations.", sender: 'bot', contentType: 'text' },
      ]);
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

      const formattedAccommodations = accommodationsArray.map((acc) => ({
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
          { text: 'Here are your accommodations:', sender: 'bot', contentType: 'accommodation' },
        ]);
      }
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
          💬 Chat
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
