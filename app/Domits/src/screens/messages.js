import React, { useState, useCallback, useEffect } from 'react';
import { GiftedChat } from 'react-native-gifted-chat';

export function Messages() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: 'Hello! How can I help you today?',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'Assistant',
        },
      },
    ]);
  }, []);

  const onSend = useCallback((messages = []) => {
    // Append the user's message to the chat
    setMessages(previousMessages => GiftedChat.append(previousMessages, messages));

    // Extract the text from the most recent message
    const userMessage = messages[0].text;

    // Asynchronously call the AWS Lambda function
    (async () => {
      try {
        // Make a fetch request to your Lambda function's endpoint
        const response = await fetch('https://fbmdl2bsui.execute-api.eu-north-1.amazonaws.com/new', {
          method: 'POST',
          body: JSON.stringify({ userMessage }), // Send userMessage as JSON payload
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch response from Lambda function');
        }

        // Parse the JSON response
        const { message } = await response.json();

// Construct a new message object for the Lambda function's response
        const newMessage = {
          _id: Math.random().toString(36).substring(7),
          text: message.content, // Ensure message is converted to string
          createdAt: new Date(),
          user: {
            _id: 2, // ID of the "assistadnt" or "bot"
            name: 'Assistant',
          },
        };
        console.log(message)
        console.log(newMessage)

        // Append the Lambda function's response to the chat
        setMessages(previousMessages => GiftedChat.append(previousMessages, [newMessage]));
      } catch (error) {
        console.error("Failed to get response from Lambda function:", error);
      }
    })();
  }, []);

  return (
      <GiftedChat
          messages={messages}
          onSend={messages => onSend(messages)}
          user={{
            _id: 1, // The ID of the current user
          }}
      />
  );
}

export default Messages;
