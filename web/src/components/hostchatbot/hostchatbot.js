import React, { useState, useEffect, useCallback } from 'react';
import './hostchatbot.css';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../features/auth/UserContext';
import * as pdfjsLib from 'pdfjs-dist';
import { FiMenu, FiDownload, FiPrinter, FiMic, FiPaperclip } from 'react-icons/fi';
import axios from "axios";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js`;

import AccommodationTile from './AccommodationTile';
import useChatToggle from './hooks/useChatToggle';
import usePollySpeech from './hooks/usePollySpeech';
import useUserDetails from './hooks/useUserDetails';
import useFetchData from './hooks/useFetchData';
import useVoiceInput from './hooks/useVoiceInput';
import useChatHistory from './hooks/useChatHistory';
import stringSimilarity from 'string-similarity';


const HostChatbot = () => {
  const {role, isLoading: userLoading} = useUser();
  const location = useLocation();

  const [isUnsupportedBrowser, setIsUnsupportedBrowser] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [pdfMode, setPdfMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [awaitingUserChoice, setAwaitingUserChoice] = useState(true);
  const [currentOption, setCurrentOption] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const {messageAudios, fetchPollySpeech} = usePollySpeech();
  const {userId, username} = useUserDetails(setMessages, fetchPollySpeech);
  const {isChatOpen, toggleChat} = useChatToggle(role, location);
  const {accommodations, faqList, fetchAccommodations, fetchFAQ, fetchAllAccommodations} = useFetchData();
  const {isRecording, handleVoiceInput, stopRecording} = useVoiceInput(setUserInput);
  const {downloadChatHistory, printChatHistory} = useChatHistory(messages);

  useEffect(() => {
    if (!userLoading && role === 'Host') {
      fetchFAQ();
    }
  }, [userLoading, role, fetchFAQ]);

  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(timer);
      setRecordingTime(0); // Reset timer
    }
    return () => clearInterval(timer);
  }, [isRecording]);


  useEffect(() => {
    const isChromiumBased = !!navigator.userAgent.match(/Chrome|Chromium|Edg|Brave/);
    console.log('Browser detected:', navigator.userAgent); // Debugging line
    console.log('Is Chromium-based:', isChromiumBased);    // Debugging line
    if (!isChromiumBased) {
      setIsUnsupportedBrowser(true);
    }
  }, []);




  const handleButtonClick = useCallback((choice) => {
    setAwaitingUserChoice(false);
    setCurrentOption(choice);
    handleUserChoice(choice);
  }, []);

  const handleAccommodationQuery = async (userInput) => {
    const messageId = Date.now();
    const normalizedInput = userInput.toLowerCase().trim();
    setLoading(true);

    try {
      if (normalizedInput.includes('show all accommodations')) {
        await fetchAllAccommodations();
      } else if (normalizedInput.includes('list my accommodations')) {
        await fetchAccommodations(userId);
      } else {
        const noUnderstandMessage = "Sorry, I didn't understand your question about accommodations.";
        setMessages((prevMessages) => [
          ...prevMessages,
          { id: messageId, text: noUnderstandMessage, sender: 'bot', contentType: 'text' },
        ]);
        fetchPollySpeech(noUnderstandMessage, messageId);
        return;
      }

      if (accommodations.length === 0) {
        const noDataMessage = "Sorry, there is no accommodation data available right now.";
        setMessages((prevMessages) => [
          ...prevMessages,
          { id: messageId, text: noDataMessage, sender: 'bot', contentType: 'text' },
        ]);
        fetchPollySpeech(noDataMessage, messageId);
      } else {
        setMessages((prevMessages) => [
          ...prevMessages,
          { id: messageId, text: 'Here are your accommodations:', sender: 'bot', contentType: 'text' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching accommodations:', error);
      const errorMessage = "Sorry, I couldn't fetch the accommodations at this moment.";
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

    const normalizedInput = userInput.toLowerCase().trim();
    const faqQuestions = faqList.map((faq) => faq.question.toLowerCase());

    const bestMatch = stringSimilarity.findBestMatch(normalizedInput, faqQuestions);

    if (bestMatch.bestMatch.rating > 0.5) {
      const matchedFAQ = faqList[bestMatch.bestMatchIndex];
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: messageId,
          sender: 'bot',
          contentType: 'faq', // Indicate it's an FAQ for custom rendering
          data: matchedFAQ,   // Pass the full FAQ object for rendering
        },
      ]);
      fetchPollySpeech(matchedFAQ.answer, messageId);
    } else {
      const notFoundMessage = "Sorry, I couldn't find an answer to your question.";
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: messageId, text: notFoundMessage, sender: 'bot', contentType: 'text' },
      ]);
      fetchPollySpeech(notFoundMessage, messageId);
    }
  };



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

        // Replace greeting with the selected choice message
        setMessages([{id: messageId, text: newMessage, sender: 'bot', contentType: 'text'}]);
        fetchPollySpeech(newMessage, messageId);
      },
      [fetchPollySpeech]
  );


  const renderBrowserWarning = () => (
      <div className="browser-warning">
        <div className="warning-overlay">
          <div className="warning-content">
            <h2>Browser Not Supported</h2>
            <p>This feature only works on Chromium-based browsers like Google Chrome.</p>
            <button onClick={() => setIsUnsupportedBrowser(false)}>OK</button>
          </div>
        </div>
      </div>
  );


  const handleSubmit = useCallback(
      (e) => {
        e.preventDefault();

        if (userInput.trim()) {
          const messageId = Date.now();
          setMessages((prevMessages) => [
            ...prevMessages,
            {id: messageId, text: userInput, sender: 'user', contentType: 'text'},
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


  const handleExpertContact = () => {
    const expertMessage = 'You can contact an expert at support@domits.com or call +123456789.';
    const messageId = Date.now();
    setMessages((prevMessages) => [
      ...prevMessages,
      {id: messageId, text: expertMessage, sender: 'bot', contentType: 'text'},
    ]);
    fetchPollySpeech(expertMessage, messageId);
  };


  const handlePDFUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      alert('No file selected!');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('The file is too large. Please select a smaller file.');
      return;
    }

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;

          let extractedText = '';
          const numPagesToProcess = Math.min(pdf.numPages, 5);
          for (let i = 1; i <= numPagesToProcess; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            extractedText += pageText + '\n';
          }

          if (extractedText.length > 200) {
            alert('Error: The PDF content exceeds the 200-character limit.');
            return;
          }

          setUserInput(extractedText);
          setPdfMode(true);
        } catch {
          alert('Failed to process the PDF file.');
        }
      };
      fileReader.readAsArrayBuffer(file);
    } catch {
      alert('An error occurred while reading the file.');
    }
  };

  const goBackToOptions = useCallback(() => {
    setAwaitingUserChoice(true);
    setSuggestions([]);
    setCurrentOption(null);

    const message = `Hello again, ${username}! Please choose an option:`;
    const messageId = Date.now();

    // Clear previous messages and add only the greeting
    setMessages([{id: messageId, text: message, sender: 'bot', contentType: 'text'}]);
    fetchPollySpeech(message, messageId);
  }, [username, fetchPollySpeech]);


  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  if (userLoading) return <div>Loading...</div>;
  if (role !== 'Host') return null;

  return (
      <>
        {isUnsupportedBrowser && renderBrowserWarning()}

        <button className="hostchatbot-toggle-button" onClick={toggleChat}>
          💬
        </button>

        <div className={`hostchatbot-container ${isChatOpen ? 'open' : ''}`}>
          <div className="hostchatbot-header">
            <span>Chat with us</span>
            <button className="hamburger-menu" onClick={toggleMenu}>
              <FiMenu/>
            </button>
            {isMenuOpen && (
                <div className="hamburger-dropdown">
                  <button onClick={downloadChatHistory}>
                    <FiDownload/> Download Chat
                  </button>
                  <button onClick={printChatHistory}>
                    <FiPrinter/> Print Chat
                  </button>
                </div>
            )}
            <button className="hostchatbot-close-button" onClick={toggleChat}>
              ✖
            </button>
          </div>
          <div className="hostchatbot-window">
            {messages.map((message) => (
                <div key={`${message.id}-${message.sender}`} className={`hostchatbot-message ${message.sender}`}>
                  {message.contentType === 'faq' ? (
                      <div className="faq-layout">
                        <div className="faq-question">{message.data.question}</div>
                        <div className="faq-answer">{message.data.answer}</div>
                      </div>
                  ) : (
                      <p>{message.text}</p>
                  )}
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

            {/* Render accommodation tiles if accommodations exist */}
            {accommodations.length > 0 && (
                <div className="hostchatbot-accommodations">
                  {accommodations.map((accommodation) => (
                      <AccommodationTile key={accommodation.id} accommodation={accommodation} />
                  ))}
                </div>
            )}



            {awaitingUserChoice && (
                <div className="hostchatbot-option-buttons">
                  <button onClick={() => handleButtonClick('1')}>
                    1. I have a question regarding accommodations
                  </button>
                  <button onClick={() => handleButtonClick('2')}>
                    2. I want to learn about Domits
                  </button>
                  <button onClick={() => handleButtonClick('3')}>
                    3. Connect me with an expert
                  </button>
                </div>
            )}

            {suggestions.length > 0 && (
                <div className="hostchatbot-suggestions">
                  <p>Suggestions:</p>
                  {suggestions.map((suggestion, index) => (
                      <p
                          key={`${index}-${suggestion}`}
                          className="hostchatbot-suggestion"
                          onClick={() => setUserInput(suggestion)}
                      >
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
                placeholder={pdfMode ? 'Cannot edit text while PDF is selected' : 'Type a message...'}
                disabled={pdfMode || awaitingUserChoice}
            />
            <button
                type="button"
                onClick={handleVoiceInput}
                disabled={awaitingUserChoice || pdfMode}
                className={`icon-button ${isRecording ? 'active' : ''}`}
            >
              <FiMic/>
            </button>
            {!isRecording ? (
                <>
                  <label
                      htmlFor="pdf-upload"
                      className="icon-button"
                      style={{pointerEvents: awaitingUserChoice ? 'none' : 'auto'}}
                  >
                    <FiPaperclip/>
                    <input
                        id="pdf-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={handlePDFUpload}
                        disabled={awaitingUserChoice}
                    />
                  </label>
                  <button type="submit" disabled={loading || awaitingUserChoice || !userInput}>
                    Send
                  </button>
                </>
            ) : (
                <span>Recording... {recordingTime}s</span>
            )}
          </form>
        </div>
      </>
  );
};

  export default HostChatbot;
