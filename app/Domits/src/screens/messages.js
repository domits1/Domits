import React, { useState, useCallback, useEffect } from 'react'
import { GiftedChat } from 'react-native-gifted-chat'

export function Messages() {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: 'This is just an example for the Domits app messages tab!',
        createdAt: new Date(),
        quickReplies: {
          type: 'checkbox',
          keepIt: true,
          values: [
            {
              title: '😋 Yes',
              value: 'yes',
            },
          ],
        },
        user: {
          _id: 2,
          name: 'Domits',
        },
      },
    ])
  }, [])

  const onSend = useCallback((messages = []) => {
    setMessages(previousMessages =>
      GiftedChat.append(previousMessages, messages),
    )
  }, [])

  return (
    <GiftedChat
      messages={messages} 
      onSend={messages => onSend(messages)}
      user={{
        _id: 1,
      }}
    />
  )
}

export default Messages