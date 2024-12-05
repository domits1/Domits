import React, { useState, useEffect, useCallback } from 'react';
import './hostchatbot.css';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../UserContext';
import * as pdfjsLib from 'pdfjs-dist';
import { FiMenu, FiDownload, FiPrinter, FiMic, FiPaperclip } from 'react-icons/fi';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js`;

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

  const { messageAudios, fetchPollySpeech } = usePollySpeech();
  const { userId, username } = useUserDetails(setMessages, fetchPollySpeech);
  const { isChatOpen, toggleChat } = useChatToggle(role, location);
  const { accommodations, faqList, fetchAccommodations, fetchFAQ } = useFetchData();
  const { isRecording, handleVoiceInput, stopRecording } = useVoiceInput(setUserInput);
  const { downloadChatHistory, printChatHistory } = useChatHistory(messages);

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
    const isChromiumBased = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
    if (!isChromiumBased) {
      setIsUnsupportedBrowser(true);
    }
  }, []);


  const handleButtonClick = useCallback((choice) => {
    setAwaitingUserChoice(false);
    setCurrentOption(choice);
    handleUserChoice(choice);
  }, []);

  const handleFAQClick = useCallback(
      (question) => {
        console.log('FAQ Clicked:', question); // Debug
        const selectedFAQ = faqList.find((faq) => faq.question === question);
        if (selectedFAQ) {
          const messageId = Date.now();
          const answer = selectedFAQ.answer;

          setMessages((prev) => [
            ...prev,
            { id: messageId, text: answer, sender: 'bot', contentType: 'text' },
          ]);
          fetchPollySpeech(answer, messageId);
        } else {
          console.error('FAQ not found for the question:', question);
        }
      },
      [faqList, fetchPollySpeech]
  );


  const handleUserChoice = useCallback(
      (choice) => {
        const messageId = Date.now();
        let newMessage = '';

        switch (choice) {
          case '1':
            newMessage = 'You can ask me about accommodations. Here are some suggestions:';
            setSuggestions(['List my accommodation', 'Show all accommodations']);
            break;
          case '2': // FAQ handling
            if (faqList.length > 0) {
              newMessage = 'Here are some frequently asked questions about Domits:';
              setSuggestions(['Is Domits 100% free for hosts']);
              console.log('FAQ Suggestions:', faqList.map((faq) => faq.question)); // Debug
            } else {
              newMessage = 'No FAQ data available at the moment.';
              setSuggestions([]);
            }
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

        setMessages((prev) => [
          ...prev,
          { id: messageId, text: newMessage, sender: 'bot', contentType: 'text' },
        ]);
        fetchPollySpeech(newMessage, messageId);
      },
      [faqList, fetchPollySpeech]
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
            { id: messageId, text: userInput, sender: 'user', contentType: 'text' },
          ]);

          fetchPollySpeech(userInput, messageId);

          setUserInput('');
          setPdfMode(false);
        }
      },
      [userInput, fetchPollySpeech]
  );

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

  const goBackToOptions = () => {
    setAwaitingUserChoice(true);
    setSuggestions([]);
    setCurrentOption(null);

    const message = `Hello again, ${username}! Please choose an option:`;
    const messageId = Date.now();
    setMessages([{ id: messageId, text: message, sender: 'bot', contentType: 'text' }]);
    fetchPollySpeech(message, messageId);
  };

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
              <FiMenu />
            </button>
            {isMenuOpen && (
                <div className="hamburger-dropdown">
                  <button onClick={downloadChatHistory}>
                    <FiDownload /> Download Chat
                  </button>
                  <button onClick={printChatHistory}>
                    <FiPrinter /> Print Chat
                  </button>
                </div>
            )}
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
                  <button onClick={() => handleButtonClick('1')}>
                    1. I have a question regarding accommodations
                  </button>
                  <button onClick={() => handleButtonClick('2')}>
                    2. I want to learn about Domits
                  </button>
                  <button onClick={() => handleButtonClick('3')}>3. Connect me with an expert</button>
                </div>
            )}

            {suggestions.length > 0 && (
                <div className="hostchatbot-suggestions">
                  <p>Suggestions:</p>
                  {suggestions.map((suggestion, index) => (
                      <button
                          key={index}
                          className="hostchatbot-suggestion"
                          onClick={() => handleFAQClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                  ))}
                </div>
            )}

            {suggestions.length > 0 && (
                <div className="hostchatbot-suggestions">
                  <p>Suggestions:</p>
                  {suggestions.map((suggestion, index) => (
                      <button
                          key={index}
                          className="hostchatbot-suggestion"
                          onClick={() => handleFAQClick(suggestion)}
                      >
                        {suggestion}
                      </button>
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
              <FiMic />
            </button>
            {!isRecording ? (
                <>
                  <label
                      htmlFor="pdf-upload"
                      className="icon-button"
                      style={{ pointerEvents: awaitingUserChoice ? 'none' : 'auto' }}
                  >
                    <FiPaperclip />
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
