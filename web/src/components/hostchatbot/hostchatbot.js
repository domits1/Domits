import React, { useState } from 'react';
import axios from 'axios';
import './hostchatbot.css'; 

const HostChatbot = () => {
  const [messages, setMessages] = useState([
    { text: 'Hello! How can I assist you today?', sender: 'bot' }
  ]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false); 

  const handleUserInput = (e) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (userInput.trim()) {
      const newMessages = [...messages, { text: userInput, sender: 'user' }];
      setMessages(newMessages);

     
      setUserInput('');

      await fetchBotReply(newMessages);
    }
  };

  const fetchBotReply = async (newMessages) => {
    setLoading(true); 

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo', 
          messages: [{ role: 'user', content: newMessages[newMessages.length - 1].text }],
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

  return (
    <div className="chatbot">
      <div className="chat-window">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            {message.text}
          </div>
        ))}
        {loading && <div className="message bot">Bot is typing...</div>}
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
