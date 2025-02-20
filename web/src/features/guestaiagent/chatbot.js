import React, {useState, useRef, useEffect} from 'react'
import axios from 'axios'
import './chatbot.css'
import {useUser} from '../auth/UserContext'
import {Auth} from 'aws-amplify'

const Chat = () => {
  const {user, isLoading} = useUser()
  const [userInput, setUserInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [chatID, setChatID] = useState(localStorage.getItem('chatID') || null)
  const [predefinedMessagesVisible, setPredefinedMessagesVisible] =
    useState(true)
  const [subQuestions, setSubQuestions] = useState([])
  const [currentLayer, setCurrentLayer] = useState('main')
  const [subSubQuestions, setSubSubQuestions] = useState([])
  const [messageCount, setMessageCount] = useState(0)
  const [isAIChat, setIsAIChat] = useState(true) // Tracks whether chatting with AI or Employee
  const [employeeConnectionId, setEmployeeConnectionId] = useState(null) // Employee connection
  const [socket, setSocket] = useState(null) // WebSocket instance
  const [isConnected, setIsConnected] = useState(false) // WebSocket connection status
  const [isConsentGiven, setIsConsentGiven] = useState(false) // Track user consent
  const [showHumanDecision, setShowHumanDecision] = useState(false) // Show AI/Human decision prompt
  const [showConsentDecision, setShowConsentDecision] = useState(false) // Show consent decision prompt
  const [welcomeMessageSent, setWelcomeMessageSent] = useState(false) // Track if welcome message has been sent
  const chatMessagesRef = useRef(null)

  const predefinedMessages = [
    'Inspire Me Where to Go',
    'I Need Customer Support',
    'Plan My Trip',
    'I Want a Sunny Vacation',
    "I'm Traveling on a Budget",
    "I'm Planning a Family Vacation",
    "I'm Looking for a Unique Experience",
  ]

  const decisionTree = {
    /* Your existing decision tree logic here */
  }

  useEffect(() => {
    if (!isLoading && (chatID || user)) {
      loadChatHistory()
    } else if (!isLoading) {
      sendWelcomeMessage()
    }
  }, [isLoading, chatID, user, welcomeMessageSent])

  const scrollToBottom = () => {
    const chatMessages = chatMessagesRef.current
    chatMessages.scrollTop = chatMessages.scrollHeight
  }

  const loadChatHistory = async () => {
    try {
      const params = chatID ? {chatID} : {userID: user.id}
      const response = await axios.get(
        'https://pfjspybvsi.execute-api.eu-north-1.amazonaws.com/default/uChatbotFetchChatHistory',
        {params},
      )
      if (response.data.messages) {
        setMessages(
          response.data.messages.map(msg => ({
            text: msg.content,
            sender: msg.role === 'user' ? 'user' : 'ai',
            accommodations: msg.accommodations || null,
          })),
        )
        scrollToBottom()
      }
    } catch (error) {
      //console.error('Error loading chat history:', error);
    }
  }

  const sendWelcomeMessage = () => {
    const welcomeMessage =
      "Hi! I am Sophia, your AI assistant. I'm here to help you as best as I can. How can I assist you today?"
    setMessages(prevMessages => [
      ...prevMessages,
      {text: welcomeMessage, sender: 'ai'},
    ])
  }

  const sendMessage = async (message = userInput) => {
    if (message.trim() === '') return

    // Add user message only once
    if (isAIChat) {
      setMessages(prevMessages => [
        ...prevMessages,
        {text: message, sender: 'user'},
      ])
    }

    setUserInput('')
    setMessageCount(prevCount => prevCount + 1)

    if (isAIChat) {
      handleAIResponse(message)
    } else if (employeeConnectionId) {
      sendMessageToEmployee(message)
    }
  }

  const handleAIResponse = async message => {
    setLoading(true)

    if (currentLayer === 'main' && decisionTree[message]) {
      setSubQuestions(decisionTree[message].main)
      setCurrentLayer(message)
      setPredefinedMessagesVisible(false)
      setSubSubQuestions([])
    } else if (
      decisionTree[currentLayer] &&
      decisionTree[currentLayer][message]
    ) {
      if (Object.values(decisionTree[currentLayer]).flat().includes(message)) {
        setSubSubQuestions(decisionTree[currentLayer][message])
      }
      setSubQuestions([])
      setCurrentLayer(message)
    } else {
      setPredefinedMessagesVisible(false)
      setSubQuestions([])
      setSubSubQuestions([])
      setCurrentLayer('main')
    }

    const tempUserInput = message

    const typingMessage = {text: 'Sophia (AI) is typing', sender: 'typing'}
    setMessages(prevMessages => [...prevMessages, typingMessage])
    scrollToBottom()

    try {
      const payload = {query: tempUserInput}
      if (chatID) payload.chatID = chatID
      if (user) payload.userID = user.id

      const response = await axios.post('http://localhost:3001/query', payload)
      if (response.data.chatID && !chatID) {
        setChatID(response.data.chatID)
        localStorage.setItem('chatID', response.data.chatID)
      }

      setMessages(prevMessages =>
        prevMessages.filter(message => message.sender !== 'typing'),
      )
      const {message: aiMessage, accommodations} = response.data
      setMessages(prevMessages => [
        ...prevMessages,
        {text: aiMessage, sender: 'ai', accommodations},
      ])
      scrollToBottom()

      // After 5 messages, ask if they want to talk to a human
      if (messageCount + 1 >= 5) {
        setShowHumanDecision(true) // Show the decision prompt
      }
    } catch (error) {
      //console.error('Error sending message:', error);
      setMessages(prevMessages =>
        prevMessages.filter(message => message.sender !== 'typing'),
      )
      scrollToBottom()
    } finally {
      setLoading(false)
    }
  }

  const handleUserDecision = decision => {
    setShowHumanDecision(false) // Hide the decision prompt
    setMessageCount(0)

    if (decision === 'human') {
      setMessages(prevMessages => [
        ...prevMessages,
        {
          text: 'We can connect you to a human. Messages sent to the employee can be saved for training purposes. Do you agree?',
          sender: 'system',
        },
      ])
      setShowConsentDecision(true) // Show consent prompt
    } else {
      setMessages(prevMessages => [
        ...prevMessages,
        {
          text: 'Great! Let’s continue chatting with Sophia (AI).',
          sender: 'system',
        },
      ])
    }
  }

  const handleConsentDecision = async consent => {
    setShowConsentDecision(false) // Hide the consent prompt

    if (consent === 'yes') {
      setIsConsentGiven(true)
      await connectToEmployee()
    } else {
      setMessages(prevMessages => [
        ...prevMessages,
        {
          text: 'You chose not to connect to a human. Please continue with the AI.',
          sender: 'system',
        },
      ])
      setIsAIChat(true)
    }
  }

  const connectToEmployee = async () => {
    try {
      const response = await fetch(
        'https://1qvev42qe9.execute-api.eu-north-1.amazonaws.com/default/eChatFindEmployee',
      )
      const responseData = await response.json()
      const data = JSON.parse(responseData.body)

      if (data.connectionId) {
        setEmployeeConnectionId(data.connectionId)
        setIsAIChat(false) // Switch to Employee chat
        setMessages(prevMessages => [
          ...prevMessages,
          {text: 'Connecting you to an agent...', sender: 'system'},
        ])

        let userInfo
        try {
          userInfo = await Auth.currentUserInfo()
        } catch (error) {
          //console.error('Error getting user info:', error);
        }

        let userId, userName
        if (userInfo) {
          userId = userInfo.attributes.sub
          userName = userInfo.attributes['given_name'] || 'Anonymous'
        } else {
          userId = `anon-${Math.random().toString(36).substring(2, 15)}`
          userName = 'Anonymous'
        }

        const ws = new WebSocket(
          `wss://0e39mc46j0.execute-api.eu-north-1.amazonaws.com/production/?userId=${userId}&userName=${userName}`,
        )

        ws.onopen = () => {
          //console.log('WebSocket connection opened');
          setMessages(prevMessages => [
            ...prevMessages,
            {
              text: 'Connection successful. You can now chat with the employee',
              sender: 'system',
            },
          ])
          setIsConnected(true)
          setSocket(ws)
        }

        ws.onmessage = event => {
          const incomingMessage = JSON.parse(event.data)
          setMessages(prevMessages => [
            ...prevMessages,
            {text: incomingMessage.message, sender: 'employee'},
          ])
        }

        ws.onerror = error => {
          //console.error('WebSocket error:', error);
        }

        ws.onclose = () => {
          //console.log('WebSocket connection closed');
          setIsConnected(false)
          setMessageCount(0)
        }
      } else {
        setMessages(prevMessages => [
          ...prevMessages,
          {
            text: 'No agents are available right now. Please continue with the AI.',
            sender: 'system',
          },
        ])
        setIsAIChat(true)
      }
    } catch (err) {
      //console.error('Failed to connect to employee:', err);
      setMessages(prevMessages => [
        ...prevMessages,
        {
          text: 'Failed to connect to an agent. Please continue with the AI.',
          sender: 'system',
        },
      ])
      setIsAIChat(true)
    }
  }

  const sendMessageToEmployee = message => {
    if (socket && isConnected) {
      const payload = {
        action: 'sendMessage',
        recipientConnectionId: employeeConnectionId,
        message: message,
      }
      socket.send(JSON.stringify(payload))
    }

    setMessages(prevMessages => [
      ...prevMessages,
      {text: message, sender: 'user'},
    ])
  }

  const closeEmployeeChat = () => {
    if (socket) {
      socket.close() // Close the WebSocket connection
    }
    setIsConnected(false)
    setIsAIChat(true) // Switch back to AI chat
    setMessages(prevMessages => [
      ...prevMessages,
      {
        text: 'Employee has left the chat. Switching back to Sophia (AI).',
        sender: 'system',
      },
    ])
  }

  return (
    <div className="cbc-chat-center">
      <div className="cbc-chat-container">
        {/* Text field for showing chat status and Close Chat button */}
        <div className="cbc-chat-status">
          <p>
            Currently chatting with: {isAIChat ? 'Sophia (AI)' : 'Employee'}
          </p>
          {!isAIChat && (
            <button
              className="cbc-close-chat-button"
              onClick={closeEmployeeChat}>
              Close Chat
            </button>
          )}
        </div>

        <div className="cbc-chat-messages" ref={chatMessagesRef}>
          {messages.map((message, index) => (
            <div
              key={index}
              className={`cbc-message-wrapper cbc-${message.sender}`}>
              <div className="cbc-sender">
                {message.sender === 'user'
                  ? 'You'
                  : message.sender === 'ai'
                    ? 'Sophia (AI)'
                    : message.sender === 'employee'
                      ? 'Employee'
                      : 'System'}
              </div>
              <div className={`cbc-bubble ${message.sender}`}>
                <p>{message.text}</p>
              </div>

              {/* Accommodation tiles rendering */}
              {message.sender === 'ai' && message.accommodations && (
                <div className="cbc-accommodation-tiles">
                  {message.accommodations.map((accommodation, idx) => (
                    <div key={idx} className="cbc-accommodation-tile">
                      <img
                        src={accommodation.Images.image1}
                        alt="Accommodation"
                        className="cbc-accommodation-image"
                      />
                      <div className="cbc-accommodation-details">
                        <h3>{accommodation.Title}</h3>
                        <p>{accommodation.Description}</p>
                        <p>
                          <strong>City:</strong> {accommodation.City}
                        </p>
                        <p>
                          <strong>Bathrooms:</strong> {accommodation.Bathrooms}
                        </p>
                        <p>
                          <strong>Guest Amount:</strong>{' '}
                          {accommodation.GuestAmount}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Show AI/Human decision and consent prompts inside the chat box */}
        {showHumanDecision && (
          <div className="cbc-decision-box">
            <p>Would you like to continue with AI or talk to a human?</p>
            <button onClick={() => handleUserDecision('human')}>
              Talk to Human
            </button>
            <button onClick={() => handleUserDecision('ai')}>
              Continue with AI
            </button>
          </div>
        )}

        {showConsentDecision && (
          <div className="cbc-decision-box">
            <p>
              Do you consent to having messages sent to an employee saved for
              training purposes?
            </p>
            <button onClick={() => handleConsentDecision('yes')}>Yes</button>
            <button onClick={() => handleConsentDecision('no')}>No</button>
          </div>
        )}

        <div className="cbc-chat-input">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyUp={e => {
              if (e.key === 'Enter') sendMessage()
            }}
            placeholder="Type a message..."
            disabled={loading}
          />
          <button onClick={() => sendMessage()} disabled={loading}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default Chat
