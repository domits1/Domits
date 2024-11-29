import React, { useState, useEffect, useCallback } from 'react';
import './hostchatbot.css';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../UserContext';
import * as pdfjsLib from 'pdfjs-dist';
import { FiMenu, FiDownload, FiPrinter, FiMic, FiPaperclip } from 'react-icons/fi'; // Icons for buttons

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

  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [pdfMode, setPdfMode] = useState(false); // Track if the input is populated from a PDF
  const [loading, setLoading] = useState(false);
  const [awaitingUserChoice, setAwaitingUserChoice] = useState(true); // Ensure decisions disable text box
  const [currentOption, setCurrentOption] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // For hamburger menu

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

          // Add the user message to the chat
          setMessages((prevMessages) => [
            ...prevMessages,
            { id: messageId, text: userInput, sender: 'user', contentType: 'text' },
          ]);

          // Fetch Polly speech for the input text
          fetchPollySpeech(userInput, messageId);

          // Reset input field and PDF mode
          setUserInput('');
          setPdfMode(false); // Exit PDF mode after sending
        }
      },
      [userInput, fetchPollySpeech]
  );

  const handlePDFUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.error('No file selected');
      alert('No file selected!');
      return;
    }

    console.log('Selected file:', file.name, 'Size:', file.size);

    if (file.size > 5 * 1024 * 1024) { // Limit to 5 MB
      console.error('File is too large');
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
          const numPagesToProcess = Math.min(pdf.numPages, 5); // Limit to first 5 pages
          for (let i = 1; i <= numPagesToProcess; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(' ');
            extractedText += pageText + '\n';
          }

          if (extractedText.length > 200) {
            console.error('Extracted text exceeds 200-character limit');
            alert('Error: The PDF content exceeds the 200-character limit.');
            return;
          }

          setUserInput(extractedText);
          setPdfMode(true);
        } catch (error) {
          console.error('Error processing PDF:', error);
          alert('Failed to process the PDF file.');
        }
      };
      fileReader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading file:', error);
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
        <button className="hostchatbot-toggle-button" onClick={toggleChat}>
          💬
        </button>

        <div className={`hostchatbot-container ${isChatOpen ? 'open' : ''}`}>
          <div className="hostchatbot-header">
            <span>Chat with us</span>
            {/* Hamburger menu */}
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
                placeholder={pdfMode ? 'Cannot edit text while PDF is selected' : 'Type a message...'}
                disabled={pdfMode || awaitingUserChoice} // Disable when awaiting user choice or in PDF mode
            />
            {/* Voice button */}
            <button type="button" onClick={handleVoiceInput} disabled={awaitingUserChoice || isRecording || pdfMode} className="icon-button">
              <FiMic />
            </button>
            {/* PDF upload button */}
            <label htmlFor="pdf-upload" className="icon-button" style={{ pointerEvents: awaitingUserChoice ? 'none' : 'auto' }}>
              <FiPaperclip />
              <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handlePDFUpload}
                  disabled={awaitingUserChoice} // Disable PDF upload button until decision is made
              />
            </label>
            {/* Send button */}
            <button type="submit" disabled={loading || awaitingUserChoice || !userInput}>
              Send
            </button>
          </form>
        </div>
      </>
  );
};

export default HostChatbot;
