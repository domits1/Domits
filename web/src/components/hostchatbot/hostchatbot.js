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
  const [messageAudios, setMessageAudios] = useState({});
  const [isRecording, setIsRecording] = useState(false); // State for recording
  const [isRecording, setIsRecording] = useState(false);

  const { role, isLoading: userLoading } = useUser();
  const location = useLocation();

  const fetchPollySpeech = async (text, messageId) => {
    try {
      const response = await axios.post(
          'https://4gcqhbseki.execute-api.eu-north-1.amazonaws.com/default/PollySpeech',
          { text: text, voiceId: 'Joanna' },
          { headers: { 'Content-Type': 'application/json' } }
      );

      const audioContent = response.data?.body ? JSON.parse(response.data.body).audioContent : null;
      if (audioContent) {
        setMessageAudios((prevAudios) => ({
          ...prevAudios,
          [messageId]: `data:audio/mp3;base64,${audioContent}`,
        }));
      } else {
        console.warn("No audio content found in response.");
      }
    } catch (error) {
      console.error('Error fetching speech from Polly:', error);
    }
  };

  useEffect(() => {
    const setUserDetails = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        setUserId(userInfo.attributes.sub);
        const name = userInfo.attributes['custom:username'] || 'Host';
        setUserName(name);
        const greeting = `Hello, ${name}! Please choose an option:`;
        const messageId = Date.now();
        setMessages([{ id: messageId, text: greeting, sender: 'bot', contentType: 'text' }]);
        fetchPollySpeech(greeting, messageId);
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
    const message = `Hello again, ${username}! Please choose an option:`;
    const messageId = Date.now();
    setMessages([{ id: messageId, text: message, sender: 'bot', contentType: 'text' }]);
    fetchPollySpeech(message, messageId);
  };

  const handleButtonClick = (choice) => {
    setAwaitingUserChoice(false);
    setCurrentOption(choice);
    handleUserChoice(choice);
  };

  const handleUserChoice = (choice) => {
    let newMessage = '';
    const messageId = Date.now();

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
      { id: messageId, text: newMessage, sender: 'bot', contentType: 'text' },
    ]);
    fetchPollySpeech(newMessage, messageId);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (userInput.trim()) {
      const messageId = Date.now();
      const newMessages = [
        ...messages,
        { id: messageId, text: userInput, sender: 'user', contentType: 'text' },
      ];
      setMessages(newMessages);
      fetchPollySpeech(userInput, messageId);
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

  const handleAccommodationQuery = async (userInput) => {
    const messageId = Date.now();

    const normalizedInput = userInput.toLowerCase().trim();
    if (normalizedInput.includes("show all accommodations") || normalizedInput.includes("list all accommodations")) {
      await fetchAllAccommodations();
    } else {
      await fetchAccommodations();
    }

    if (accommodations.length === 0) {
      const noDataMessage = "Sorry, there is no accommodation data available right now.";
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: messageId, text: noDataMessage, sender: 'bot', contentType: 'text' },
      ]);
      fetchPollySpeech(noDataMessage, messageId);
      return;
    }

    setLoading(true);
    try {
      const contextData = accommodations.map((acc) => ({
        title: acc.title || 'Accommodation',
        city: acc.city || 'Not specified',
        country: acc.country || 'Not specified',
        bathrooms: acc.bathrooms || 'Not specified',
        guestAmount: acc.guestAmount || 'Not specified',
      }));

      const responseMessage = `Here are the accommodations:\n${contextData.map((acc) => `
        Title: ${acc.title}
        City: ${acc.city}
        Country: ${acc.country}
        Bathrooms: ${acc.bathrooms}
        Guest Capacity: ${acc.guestAmount}
      `).join('\n\n')}`;

      setMessages((prevMessages) => [
        ...prevMessages,
        { id: messageId, text: responseMessage, sender: 'bot', contentType: 'text' },
      ]);
      fetchPollySpeech(responseMessage, messageId);
    } catch (error) {
      const errorMessage = "Sorry, I couldn't process your request at the moment.";
      console.error('Error with GPT-3.5 Turbo API:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: messageId, text: errorMessage, sender: 'bot', contentType: 'text' },
      ]);
      fetchPollySpeech(errorMessage, messageId);
    } finally {
      setLoading(false);
    }
  };

  const handleFAQQuery = (userInput) => {
    const messageId = Date.now();

    if (faqList.length === 0) {
      const noFaqMessage = "Sorry, I don't have any FAQs available at the moment.";
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: messageId, text: noFaqMessage, sender: 'bot', contentType: 'text' },
      ]);
      fetchPollySpeech(noFaqMessage, messageId);
      return;
    }

    const faqQuestions = faqList.map((faq) => faq.question.toLowerCase());
    const bestMatch = stringSimilarity.findBestMatch(userInput.toLowerCase(), faqQuestions);

    if (bestMatch.bestMatch.rating > 0.5) {
      const matchedFAQ = faqList[bestMatch.bestMatchIndex];
      const faqMessage = `Q: ${matchedFAQ.question} A: ${matchedFAQ.answer}`;
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: messageId, text: faqMessage, sender: 'bot', contentType: 'faq' },
      ]);
      fetchPollySpeech(faqMessage, messageId);
    } else {
      const notFoundMessage = "Sorry, I couldn't find an answer to your question.";
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: messageId, text: notFoundMessage, sender: 'bot', contentType: 'text' },
      ]);
      fetchPollySpeech(notFoundMessage, messageId);
    }
  };

  const handleExpertContact = () => {
    const expertMessage = 'You can contact an expert at support@domits.com or call +123456789.';
    const messageId = Date.now();
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: messageId, text: expertMessage, sender: 'bot', contentType: 'text' },
    ]);
    fetchPollySpeech(expertMessage, messageId);
  };


    recognition.start();
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
    } catch (error) {
      console.error('Error fetching accommodations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAccommodations = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/ReadAccommodation', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const responseData = await response.json();
      const allAccommodations = responseData.body ? JSON.parse(responseData.body) : [];
      const formattedAccommodations = allAccommodations.map((acc) => ({
        id: acc.ID,
        title: acc.Title || 'Accommodation',
        city: acc.City,
        bathrooms: acc.Bathrooms,
        guestAmount: acc.GuestAmount,
        images: acc.Images || {},
      }));

      setAccommodations(formattedAccommodations);
    } catch (error) {
      console.error('Error fetching all accommodations:', error);
    } finally {
      setLoading(false);
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

    recognition.onstart = () => {
  const toggleChat = () => setIsChatOpen(!isChatOpen);

  const downloadChatHistory = () => {
    const chatText = messages
        .map(message => `${message.sender === 'bot' ? 'Bot' : 'User'}: ${message.text}`)
        .join('\n\n');

    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chat_history.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const printChatHistory = () => {
    const printableContent = messages
        .map(message => `<p><strong>${message.sender === 'bot' ? 'Bot' : 'User'}:</strong> ${message.text}</p>`)
        .join('');

    const newWindow = window.open('', '', 'width=600,height=400');
    newWindow.document.write(`
      <html>
        <head>
          <title>Chat History</title>
        </head>
        <body>
          <h2>Chat History</h2>
          ${printableContent}
        </body>
      </html>
    `);
    newWindow.document.close();
    newWindow.print();
  };

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
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`hostchatbot-message ${
                        message.contentType === 'accommodation'
                            ? 'accommodation-layout'
                            : message.contentType === 'faq'
                                ? 'faq-layout'
                                : message.sender
                    }`}
                >
                  <p>{message.text}</p>
                  {messageAudios[message.id] && (
                      <button onClick={() => new Audio(messageAudios[message.id]).play()} className="play-audio-button">
                        {message.sender === 'user' ? 'Hear My Question' : 'Hear Response'}
                      </button>
                  )}
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
            <button
                type="button"
                onClick={handleVoiceInput}
                disabled={awaitingUserChoice || isRecording}
                className="voice-input-button"
            >
              {isRecording ? 'Listening...' : 'Start Recording'}
            </button>
            <button type="submit" disabled={loading || awaitingUserChoice}>
              Send
            </button>
          </form>
          <button onClick={downloadChatHistory} className="download-button">Download Chat</button>
          <button onClick={printChatHistory} className="print-button">Print Chat</button>
        </div>
      </>
  );
};

export default HostChatbot;
