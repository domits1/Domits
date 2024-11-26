import React, { useState, useEffect, useCallback } from 'react';
import './hostchatbot.css';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../UserContext';
import { PDFDocument } from 'pdf-lib';

import AccommodationTile from './AccommodationTile';
import useChatToggle from './hooks/useChatToggle';
import usePollySpeech from './hooks/usePollySpeech';
import useUserDetails from './hooks/useUserDetails';
import useFetchData from './hooks/useFetchData';
import useVoiceInput from './hooks/useVoiceInput';
import useChatHistory from './hooks/useChatHistory';

const HostChatbot = () => {
  const { role, isLoading: userLoading } = useUser();
  const location = useLocation();

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [awaitingUserChoice, setAwaitingUserChoice] = useState(true);
  const [currentOption, setCurrentOption] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  const { messageAudios, fetchPollySpeech } = usePollySpeech();
  const { userId, username } = useUserDetails(setMessages, fetchPollySpeech);
  const { isChatOpen, toggleChat } = useChatToggle(role, location);
  const { accommodations, faqList, fetchAccommodations, fetchFAQ } = useFetchData();
  const { isRecording, handleVoiceInput } = useVoiceInput(setUserInput);
  const { downloadChatHistory, printChatHistory } = useChatHistory(messages);

  useEffect(() => {
    if (!userLoading && role === 'Host') {
      fetchFAQ();
    }
  }, [userLoading, role, fetchFAQ]);

  const handleButtonClick = useCallback((choice) => {
    setAwaitingUserChoice(false);
    setCurrentOption(choice);
    handleUserChoice(choice);
  }, []);

  const handleUserChoice = useCallback(
      (choice) => {
        const messageId = Date.now();
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

        setMessages([{ id: messageId, text: newMessage, sender: 'bot', contentType: 'text' }]);
        fetchPollySpeech(newMessage, messageId);
      },
      [fetchPollySpeech]
  );

  const handleSubmit = useCallback(
      (e) => {
        e.preventDefault();

        if (userInput.trim()) {
          const messageId = Date.now();
          setMessages((prevMessages) => [
            ...prevMessages,
            { id: messageId, text: userInput, sender: 'user', contentType: 'text' },
          ]);
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
      },
      [userInput, currentOption, fetchPollySpeech]
  );

  const handleAccommodationQuery = async (userInput) => {
    const messageId = Date.now();
    if (userInput.toLowerCase().includes('show all accommodations')) {
      await fetchAccommodations();
    }

    const responseMessage = accommodations.length
        ? `Here are the accommodations:\n${accommodations
            .map((acc) => `Title: ${acc.title} City: ${acc.city}`)
            .join('\n\n')}`
        : 'Sorry, there is no accommodation data available right now.';

    setMessages((prevMessages) => [
      ...prevMessages,
      { id: messageId, text: responseMessage, sender: 'bot', contentType: 'text' },
    ]);
    fetchPollySpeech(responseMessage, messageId);
  };

  const handleFAQQuery = (userInput) => {
    const messageId = Date.now();
    const bestMatch = faqList.find((faq) =>
        faq.question.toLowerCase().includes(userInput.toLowerCase())
    );
    const responseMessage = bestMatch
        ? `Q: ${bestMatch.question} A: ${bestMatch.answer}`
        : "Sorry, I couldn't find an answer to your question.";

    setMessages((prevMessages) => [
      ...prevMessages,
      { id: messageId, text: responseMessage, sender: 'bot', contentType: 'text' },
    ]);
    fetchPollySpeech(responseMessage, messageId);
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

  const handlePDFUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        const pdfData = new Uint8Array(e.target.result);
        const pdfDoc = await PDFDocument.load(pdfData);
        const pages = pdfDoc.getPages();
        const extractedText = pages.map((page) => page.getTextContent().items.map((item) => item.str).join(' ')).join('\n');

        const messageId = Date.now();
        setMessages((prevMessages) => [
          ...prevMessages,
          { id: messageId, text: extractedText, sender: 'user', contentType: 'text' },
        ]);
        fetchPollySpeech(extractedText, messageId);
      };
      fileReader.readAsArrayBuffer(file);
    }
  };

  const goBackToOptions = () => {
    setAwaitingUserChoice(true);
    setSuggestions([]);
    setCurrentOption(null);

    const message = `Hello again, ${username}! Please choose an option:`;
    const messageId = Date.now();
    setMessages([{ id: messageId, text: message, sender: 'bot', contentType: 'text' }]);
    fetchPollySpeech(message, messageId);
  };

  // Conditional rendering based on user role
  if (userLoading) return <div>Loading...</div>;
  if (role !== 'Host') return null;

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
                <div key={message.id} className={`hostchatbot-message ${message.sender}`}>
                  <p>{message.text}</p>
                  {messageAudios[message.id] && (
                      <button
                          onClick={() => new Audio(messageAudios[message.id]).play()}
                          className="play-audio-button"
                      >
                        {message.sender === 'user' ? 'Hear My Question' : 'Hear Response'}
                      </button>
                  )}
                </div>
            ))}
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
          <input
              type="file"
              accept="application/pdf"
              onChange={handlePDFUpload}
              className="pdf-upload-button"
          />
          <button onClick={downloadChatHistory} className="download-button">
            Download Chat
          </button>
          <button onClick={printChatHistory} className="print-button">
            Print Chat
          </button>
        </div>
      </>
  );
};

export default HostChatbot;
