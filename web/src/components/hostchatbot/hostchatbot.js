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
    fetchRegistrationNumbers(); // Call the function here
  }, [userId]);

 // Function to fetch registration numbers using POST request
const fetchRegistrationNumbers = async () => {
  try {
    const response = await fetch(
      'https://xvol2vwxgi.execute-api.eu-north-1.amazonaws.com/default/fetchRegistrationNumbers',
      {
        method: 'POST', // Change the method to POST
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Requesting registration numbers' }), // Send a body if needed
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch registration numbers');
    }

    const data = await response.json();
    console.log('Registration numbers:', data);
  } catch (error) {
    console.error('Error fetching registration numbers:', error);
  }
};


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

      if (awaitingFeedback) {
        await handleUserFeedback(userInput.toLowerCase(), newMessages);
      } else {
        await processUserMessage(newMessages);
      }
    }
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

  const processUserMessage = async (newMessages) => {
    const userMessage = newMessages[newMessages.length - 1].text.toLowerCase();

    if (faqList.length === 0) {
      console.log('No FAQ data available.');
      await fetchBotReply(newMessages);
      return;
    }

    const faqQuestions = faqList.map((faq) => faq.question.toLowerCase());
    const bestMatch = stringSimilarity.findBestMatch(userMessage, faqQuestions);

    if (bestMatch.bestMatch.rating > 0.7) {
      const matchedFAQ = faqList[bestMatch.bestMatchIndex];
      const faqAnswer = matchedFAQ.answer;

      setMessages([
        ...newMessages,
        { text: faqAnswer, sender: 'bot', contentType: 'text' },
        {
          text: 'Is this the answer you were looking for? (yes/no)',
          sender: 'bot',
          contentType: 'text',
        },
      ]);
      setAwaitingFeedback(true);
    } else if (isAccommodationQuery(userMessage)) {
      handleAccommodationQuery(userMessage, newMessages);
    } else {
      await fetchBotReply(newMessages);
    }
  };

  const isAccommodationQuery = (userMessage) => {
    const accommodationKeywords = ['accommodation', 'room', 'guest', 'city', 'bathrooms'];
    return accommodationKeywords.some((keyword) => userMessage.includes(keyword));
  };

  const handleAccommodationQuery = (userMessage, newMessages) => {
    const accommodation = accolist.find(
      (acco) =>
        userMessage.includes(acco.Title.toLowerCase()) ||
        userMessage.includes(acco.City.toLowerCase())
    );

    if (accommodation) {
      setMessages([
        ...newMessages,
        { text: formatAccommodationResponse(accommodation), sender: 'bot', contentType: 'jsx' },
      ]);
    } else {
      setMessages([
        ...newMessages,
        {
          text: 'Sorry, I could not find that accommodation in your list.',
          sender: 'bot',
          contentType: 'text',
        },
      ]);
    }
  };

  const formatAccommodationResponse = (accommodation) => {
    const { Title, City, Description, Bathrooms, GuestAmount, Images } = accommodation;

    // Extract the first image (you can adjust this to include more images if needed)
    const imageUrl = Images?.image1 || 'default-placeholder.jpg';

    return (
      <div className="accommodation-card">
        <h3>{Title}</h3>
        <img src={imageUrl} alt={Title} className="accommodation-image" />
        <p>
          <strong>City:</strong> {City}
        </p>
        <p>
          <strong>Description:</strong> {Description}
        </p>
        <p>
          <strong>Bathrooms:</strong> {Bathrooms}
        </p>
        <p>
          <strong>Guests:</strong> {GuestAmount}
        </p>
      </div>
    );
  };

  const fetchBotReply = async (newMessages) => {
    setLoading(true);

    const formattedFaqs = faqList
      .map((faq) => `Question: ${faq.question}, Answer: ${faq.answer}`)
      .join('\n');

    const formattedAccommodations = accolist
      .map((acco) => {
        return `Title: ${acco.Title}, City: ${acco.City}, Description: ${acco.Description}, Bathrooms: ${acco.Bathrooms}, Guests: ${acco.GuestAmount}, ImageUrl: ${
          acco.Images?.image1 || ''
        }`;
      })
      .join('\n');

    const formattedAllAccommodations = allAccommodations
      .map((acco) => {
        return `Title: ${acco.Title}, City: ${acco.City}, Description: ${acco.Description}, Bathrooms: ${acco.Bathrooms}, Guests: ${acco.GuestAmount}, ImageUrl: ${
          acco.Images?.image1 || ''
        }`;
      })
      .join('\n');

    const botContext = `
      The following accommodations belong to the current logged-in host:\n${formattedAccommodations}
      
      Here are all the available accommodations (general):\n${formattedAllAccommodations}
      
      The following is general FAQ data:\n${formattedFaqs}
    `;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              name: 'WebBot',
              content: `You are WebBot. You have access to the following data:\n${botContext}`,
            },
            { role: 'user', content: newMessages[newMessages.length - 1].text },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_OPENAI_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const botReply = response.data.choices[0].message.content;
      setMessages([...newMessages, { text: botReply, sender: 'bot', contentType: 'text' }]);
    } catch (error) {
      console.error('Error fetching response from OpenAI:', error);
      setMessages([
        ...newMessages,
        { text: 'Sorry, something went wrong.', sender: 'bot', contentType: 'text' },
        {
          text: 'Do you want to chat with a customer support employee?',
          sender: 'bot',
          contentType: 'text',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccommodations = async () => {
    setLoading(true);
    if (!userId) {
      console.log('No user id');
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
        console.log('Data:', data);
        if (data.body && typeof data.body === 'string') {
          const accommodationsArray = JSON.parse(data.body);
          if (Array.isArray(accommodationsArray)) {
            setAccolist(accommodationsArray);
          } else {
            console.error('Parsed data is not an array:', accommodationsArray);
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

  const handleUserFeedback = async (feedback, newMessages) => {
    if (feedback === 'no') {
      setMessages([
        ...newMessages,
        { text: 'Okay, let me try again.', sender: 'bot', contentType: 'text' },
      ]);
      setAwaitingFeedback(false);
      await fetchBotReply(newMessages);
    } else if (feedback === 'yes') {
      setMessages([
        ...newMessages,
        { text: 'Great! Let me know if you have more questions.', sender: 'bot', contentType: 'text' },
      ]);
      setAwaitingFeedback(false);
    } else {
      setAwaitingFeedback(false);
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
