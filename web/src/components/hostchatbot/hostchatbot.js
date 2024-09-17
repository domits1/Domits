import React, { useState, useEffect } from 'react';
import axios from 'axios';
import stringSimilarity from 'string-similarity';
import './hostchatbot.css'; 
import { useUser } from '../../UserContext'; 

const HostChatbot = () => {
  const { user, isLoading } = useUser();

  const [messages, setMessages] = useState([
    { text: 'Hello! How can I assist you today?', sender: 'bot' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false); 
  const [accolist, setAccolist] = useState([]); 
  const [faqList, setFaqList] = useState([]);   

  useEffect(() => {

    fetchData();
    fetchFAQ();
  }, []);

  const handleUserInput = (e) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (userInput.trim()) {
      const newMessages = [...messages, { text: userInput, sender: 'user' }];
      setMessages(newMessages);
      setUserInput('');
      await processUserMessage(newMessages);
    }
  };

  const fetchFAQ = async () => {
    try { 
      const response = await fetch('https://vs3lm9q7e9.execute-api.eu-north-1.amazonaws.com/default/readFAQ', { 
        method: 'GET', 
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
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

  const processUserMessage = async (newMessages) => {
    const userMessage = newMessages[newMessages.length - 1].text.toLowerCase();

    if (faqList.length === 0) {
      console.log("No FAQ data available.");
      await fetchBotReply(newMessages);
      return;
    }

    const faqQuestions = faqList.map(faq => faq.question.toLowerCase());

    const bestMatch = stringSimilarity.findBestMatch(userMessage, faqQuestions);

    
    if (bestMatch.bestMatch.rating > 0.5) {
      const matchedFAQ = faqList[bestMatch.bestMatchIndex];
      const faqAnswer = matchedFAQ.answer;
      
    
      setMessages([...newMessages, { text: faqAnswer, sender: 'bot' }]);
    } else {
      console.log("No good FAQ match found. Passing to OpenAI.");
      await fetchBotReply(newMessages); 
    }
  };

  const fetchBotReply = async (newMessages) => {
    setLoading(true); 

   
    const formattedAccommodations = accolist.map(acco => {
      return `Title: ${acco.Title}, City: ${acco.City}, Description: ${acco.Description}, Bathrooms: ${acco.Bathrooms}, Guest Amount: ${acco.GuestAmount}`;
    }).join("\n");

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo', 
          messages: [
            {
              role: "system",
              name: "WebBot",
              content: `You are WebBot. You have access to the following accommodations data: \n${formattedAccommodations}`
            },
            { role: 'user', content: newMessages[newMessages.length - 1].text }
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const botReply = response.data.choices[0].message.content;
      setMessages([...newMessages, { text: botReply, sender: 'bot' }]);
    } catch (error) {
      console.error('Error fetching response from OpenAI:', error);
      setMessages([...newMessages, { text: "Sorry, something went wrong.", sender: 'bot' }]);
    } finally {
      setLoading(false); 
    }
  };

  const fetchData = async () => {
    try {
      const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/ReadAccommodation');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const responseData = await response.json();
      const data = JSON.parse(responseData.body);


      
      setAccolist(data); 
    } catch (error) {
      console.error('Error fetching or processing data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot">
      <div className="chat-window">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            {message.text}
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
        <button type="submit" disabled={loading}>Send</button>
      </form>
    </div>
  );
};

export default HostChatbot;
