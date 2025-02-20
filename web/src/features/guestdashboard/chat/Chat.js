import React, {useEffect, useState, useRef} from 'react'
import './chat.css'
import {API, graphqlOperation} from 'aws-amplify'
import {withAuthenticator} from '@aws-amplify/ui-react'
import * as mutations from '../../../graphql/mutations'
import * as queries from '../../../graphql/queries'
import Pages from '../Pages'
import * as subscriptions from '../../../graphql/subscriptions'
import {Auth} from 'aws-amplify'
import {useLocation, useNavigate} from 'react-router-dom'
import styles from './ChatPage.module.css'
import spinner from '../../../images/spinnner.gif'
import ContactItem from './ContactItem_Guest'

const Chat = ({user}) => {
  const [chats, setChats] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [showDate, setShowDate] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState({})
  const [lastMessageDate, setLastMessageDate] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedUserName, setSelectedUserName] = useState('')
  const [chatUsers, setChatUsers] = useState([])
  const [channelUUID, setChannelUUID] = useState(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [contacts, setContacts] = useState([])
  const [pendingContacts, setPendingContacts] = useState([])
  const [displayType, setDisplayType] = useState('My contacts')
  const [itemsDisplay, setItemsDisplay] = useState([])
  const [loading, setLoading] = useState(false)
  const [accoId, setAccoId] = useState('')
  const [accommodation, setAccommodation] = useState(null)
  const userId = user.attributes.sub

  const navigate = useNavigate()
  const chatContainerRef = useRef(null)

  const getUUIDForUser = userId => {
    let uuid = localStorage.getItem(`${userId}_uuid`)
    if (!uuid) {
      uuid = generateUUID()
      localStorage.setItem(`${userId}_uuid`, uuid) // Corrected this line
    }
    return uuid
  }

  const generateChannelName = (userId, recipientId) => {
    const sortedIds = [userId, recipientId].sort()
    return sortedIds.join('_')
  }

  useEffect(() => {
    const subscription = API.graphql(
      graphqlOperation(subscriptions.onCreateChat),
    ).subscribe({
      next: ({provider, value}) => {
        const newChat = value.data.onCreateChat
        setChats(prevChats => {
          const updatedChats = [...prevChats, newChat]
          updatedChats.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
          )
          return updatedChats
        })
      },
      error: error => console.error('Subscription error:', error),
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (recipientId) {
      fetchChats(recipientId)
    }
  }, [recipientId])

  useEffect(() => {
    if (userId) {
      fetchGuestContacts()
    }
  }, [userId])

  useEffect(() => {
    contacts.map((contact, index) => {
      if (contact.hostId === selectedUser.userId) {
        setAccoId(contact.AccoId)
      }
    })
  }, [selectedUser])

  useEffect(() => {
    if (accoId) {
      fetchAccommodation(accoId)
    }
  }, [accoId])

  useEffect(() => {
    if (displayType) {
      if (displayType === 'My contacts') {
        setItemsDisplay(chatUsers)
      } else {
        setItemsDisplay(pendingContacts)
      }
    }
  }, [displayType])

  const fetchGuestContacts = async () => {
    setLoading(true)
    try {
      const requestData = {
        userID: userId,
      }
      const response = await fetch(
        `https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts_Guest`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        },
      )
      if (!response.ok) {
        throw new Error('Failed to fetch host information')
      }
      const responseData = await response.json()
      const JSONData = JSON.parse(responseData.body)
      setPendingContacts(JSONData.pending)
      setContacts(JSONData.accepted)
    } catch (error) {
      console.error('Error fetching host contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedUser) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chats])

  const handleImageUpload = e => {
    const file = e.target.files[0]
    setSelectedImage(file)

    const reader = new FileReader()
    reader.onload = () => {
      setImageUrl(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const signOut = async () => {
    try {
      await Auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    fetchChatUsers()
    fetchUnreadMessages()
  }, [])

  const fetchChats = async recipientId => {
    if (!recipientId) {
      console.error('Recipient ID is undefined')
      return
    }
    try {
      const sentMessagesResponse = await API.graphql({
        query: queries.listChats,
        variables: {
          filter: {
            userId: {eq: userId},
            recipientId: {eq: recipientId},
          },
        },
      })
      const sentMessages = sentMessagesResponse.data.listChats.items

      const receivedMessagesResponse = await API.graphql({
        query: queries.listChats,
        variables: {
          filter: {
            userId: {eq: recipientId},
            recipientId: {eq: userId},
          },
        },
      })
      const receivedMessages = receivedMessagesResponse.data.listChats.items

      const allSentChats = sentMessages.map(chat => ({
        ...chat,
        isSent: true,
      }))
      const allReceivedChats = receivedMessages.map(chat => ({
        ...chat,
        isSent: false,
      }))
      const allChats = [...allSentChats, ...allReceivedChats]

      allChats.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      setChats(allChats)
    } catch (error) {
      console.error('Error fetching chats:', error)
    }
  }

  const fetchChatUsers = async () => {
    try {
      const response = await API.graphql({query: queries.listChats})
      const allChats = response.data.listChats.items

      const uniqueUsers = [
        ...new Set(allChats.flatMap(chat => [chat.userId, chat.recipientId])),
      ].filter(
        id =>
          id &&
          id !== userId &&
          id !== '7e50fbfa-3b06-486d-a96c-21a3a93b1647' &&
          id !== '383e96b7-7cd1-4377-83a4-5454ed9c9374',
      )

      const usersWithData = []

      uniqueUsers.forEach(id => {
        const userChats = allChats.filter(
          chat =>
            (chat.userId === id && chat.recipientId === userId) ||
            (chat.recipientId === id && chat.userId === userId),
        )

        if (userChats.length > 0) {
          const lastMessageTimestamp = Math.max(
            ...userChats.map(chat => new Date(chat.createdAt).getTime()),
          )
          usersWithData.push({
            userId: id,
            lastMessageTimestamp,
          })
        }
      })

      const filteredUsersData = usersWithData.sort(
        (a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp,
      )
      setChatUsers(filteredUsersData)
      setItemsDisplay(filteredUsersData)
    } catch (error) {
      console.error('Error fetching chat users:', error)
    }
  }

  const fetchUnreadMessages = async () => {
    try {
      const unreadMessagesResponse = await API.graphql({
        query: queries.listChats,
        variables: {
          filter: {
            recipientId: {eq: userId},
            isRead: {eq: false},
          },
        },
      })

      const unreadMessagesById =
        unreadMessagesResponse.data.listChats.items.reduce((acc, chat) => {
          const {userId} = chat
          acc[userId] = (acc[userId] || 0) + 1
          return acc
        }, {})

      setUnreadMessages(unreadMessagesById)
    } catch (error) {
      console.error('Error fetching unread messages:', error)
    }
  }

  const fetchAccommodation = async id => {
    try {
      const response = await fetch(
        `https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ID: id}),
        },
      )
      if (!response.ok) {
        throw new Error('Failed to fetch accommodation data')
      }
      const responseData = await response.json()
      const data = JSON.parse(responseData.body)
      setAccommodation(data)
    } catch (error) {
      console.error('Error fetching accommodation data:', error)
    }
  }

  const handleUserClick = async userId => {
    setSelectedUser({userId})
    const channelName = generateChannelName(userId, userId)
    setChannelUUID(channelName)
    setIsChatOpen(true)

    try {
      const unreadMessagesIds = chats
        .filter(chat => chat.recipientId === userId && chat.isRead === false)
        .map(chat => chat.id)

      await Promise.all(
        unreadMessagesIds.map(async id => {
          try {
            await API.graphql({
              query: mutations.updateChat,
              variables: {
                input: {
                  id: id,
                  isRead: true,
                },
              },
            })
          } catch (error) {
            console.error('Error updating read status:', error)
          }
        }),
      )

      setUnreadMessages(prevState => ({
        ...prevState,
        [userId]: 0,
      }))
    } catch (error) {
      console.error('Error updating read status:', error)
    } finally {
      fetchChats(userId)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !selectedUser.userId) return

    const recipientIdToSend = selectedUser.userId

    try {
      const result = await API.graphql({
        query: mutations.createChat,
        variables: {
          input: {
            text: newMessage.trim(),
            userId: userId,
            recipientId: recipientIdToSend,
            isRead: false,
            createdAt: new Date().toISOString(),
            channelID: channelUUID,
          },
        },
      })

      console.log('Message sent successfully:', result)

      setNewMessage('')
      setShowDate(true)
      setLastMessageDate(new Date())

      await fetchChats(recipientIdToSend)
      await fetchChatUsers()
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      },
    )
  }

  const isToday = date => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const selectUser = async (index, user) => {
    if (index != null) {
      await handleUserClick(chatUsers[index].userId)
    }
    if (user) {
      setSelectedUserName(user)
    }
  }

  return (
    <main className="page-body">
      <h2 className="chat__heading">Messages</h2>
      <section className="chat__container">
        <Pages />
        <section className={styles.chat__body}>
          <div className={styles.contactList}>
            <section className={styles.switcher}>
              <button
                className={`${styles.switchButton} ${displayType === 'My contacts' ? styles.selected : styles.disabled}`}
                onClick={() => setDisplayType('My contacts')}>
                My contacts ({chatUsers.length})
              </button>
              <button
                className={`${styles.switchButton} ${displayType === 'Pending contacts' ? styles.selected : styles.disabled}`}
                onClick={() => setDisplayType('Pending contacts')}>
                Requested ({pendingContacts.length})
              </button>
            </section>
            <section className={styles.displayBody}>
              {loading ? (
                <div>
                  <img
                    src={spinner}
                    alt="spinner"
                    style={{maxWidth: '50%', maxHeight: '50%'}}
                  />
                </div>
              ) : itemsDisplay.length > 0 ? (
                itemsDisplay.map((item, index) => (
                  <ContactItem
                    item={item}
                    index={index}
                    type={displayType}
                    selectUser={selectUser}
                    selectedUser={selectedUserName}
                    unreadMessages={unreadMessages}
                  />
                ))
              ) : (
                <div>
                  <p>This is empty for now...</p>
                  <button
                    className={styles.mainButton}
                    onClick={() => fetchGuestContacts()}>
                    Refresh
                  </button>
                </div>
              )}
            </section>
          </div>
          {selectedUser && (
            <div className="chat">
              <article
                className={`chat__message ${isChatOpen ? 'chat__message--open' : ''}`}>
                <button
                  className="chat__backButton"
                  onClick={() => setIsChatOpen(false)}>
                  Back
                </button>
                <div className={styles.chatContainer}>
                  <article className="chat__figure">
                    <aside className="chat__aside">
                      <h2>{selectedUserName}</h2>
                    </aside>
                    <article
                      className="chat__chatContainer"
                      ref={chatContainerRef}>
                      {chats
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(a.createdAt) - new Date(b.createdAt),
                        )
                        .map((chat, index, array) => (
                          <React.Fragment key={chat.id}>
                            {(index === 0 ||
                              new Date(chat.createdAt).toDateString() !==
                                new Date(
                                  array[index - 1].createdAt,
                                ).toDateString()) && (
                              <p className="chat__date">
                                <span>
                                  {isToday(new Date(chat.createdAt))
                                    ? 'Today'
                                    : new Date(
                                        chat.createdAt,
                                      ).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                </span>
                              </p>
                            )}
                            {chat.text !== '' && (
                              <div
                                className={`chat__dialog chat__dialog--${chat.userId === userId ? 'user' : 'guest'}`}>
                                {chat.text}
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt="Selected"
                          style={{maxWidth: '100%', maxHeight: '200px'}}
                        />
                      )}
                    </article>
                    <div className="chat__inputContainer">
                      <input
                        className="chat__input"
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        onKeyUp={e => {
                          if (e.key === 'Enter') {
                            sendMessage()
                          }
                        }}
                      />
                      <button
                        className="chat__send"
                        onClick={() => sendMessage()}>
                        Send
                      </button>
                    </div>
                  </article>
                  <article className={styles.accoDisplay}>
                    <h4>Referenced accommodation:</h4>
                    {accommodation === 'Accommodation not found' ? (
                      <div className={styles.textDisplay}>
                        <h3>{accommodation.Title}</h3>
                        <p>{`${accommodation.Country}, ${accommodation.City}, ${accommodation.Street}, ${accommodation.PostalCode}`}</p>
                        <button
                          className={styles.mainButton}
                          onClick={() =>
                            navigate(`/listingdetails?ID=${accommodation.ID}`)
                          }>
                          View listing details
                        </button>
                      </div>
                    ) : (
                      <div className={styles.textDisplay}>
                        <h3>This accommodation is currently unavailable</h3>
                      </div>
                    )}
                  </article>
                </div>
                <nav className="chat__nav">
                  <div className="chat__buttonWrapper">
                    <button className="chat__button chat__button--review">
                      Send review link
                    </button>
                  </div>
                </nav>
              </article>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default withAuthenticator(Chat)
