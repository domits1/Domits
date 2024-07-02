import React, { useEffect, useState, useRef } from "react";
import "./chat.css";
import { API, graphqlOperation } from "aws-amplify";
import { withAuthenticator } from "@aws-amplify/ui-react";
import * as mutations from "../../graphql/mutations";
import * as queries from "../../graphql/queries";
import Pages from "../guestdashboard/Pages";
import * as subscriptions from "../../graphql/subscriptions";
import { Auth } from 'aws-amplify';
import { useLocation, useNavigate, Link } from 'react-router-dom';

const Chat = ({ user }) => {
    const [chats, setChats] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [messageSent, setMessageSent] = useState(false);
    const [showDate, setShowDate] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState({});
    const [lastMessageDate, setLastMessageDate] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageUrl, setImageUrl] = useState("");
    const [recipientId, setRecipientId] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [chatUsers, setChatUsers] = useState([]);
    const [userUUIDs, setUserUUIDs] = useState({});
    const [channelUUID, setChannelUUID] = useState(null);
    const userId = user.attributes.sub;

    const getUUIDForUser = (userId) => {
        let uuid = localStorage.getItem(`${userId}_uuid`);
        if (!uuid) {
            uuid = generateUUID();
            localStorage.setItem(`${userId}_uuid`, uuid);
        }
        return uuid;
    };

    const generateChannelName = (userId, recipientId) => {
        const sortedIds = [userId, recipientId].sort();
        return sortedIds.join('_');
    };

    useEffect(() => {
        const subscription = API.graphql(
            graphqlOperation(subscriptions.onCreateChat)
        ).subscribe({
            next: ({ provider, value }) => {
                const newChat = value.data.onCreateChat;
                setChats(prevChats => [...prevChats, newChat]);
            },
            error: error => console.error("Subscription error:", error)
        });

        return () => subscription.unsubscribe();
    }, []);

    const navigate = useNavigate();
    const location = useLocation();
    const recipientIdFromUrl = new URLSearchParams(location.search).get('recipient');
    const channelIDFromUrl = new URLSearchParams(location.search).get('channelID');

    const updateRecipientIdInUrl = (userId) => {
        const uuid = getUUIDForUser(userId);
        const searchParams = new URLSearchParams(location.search);
        searchParams.set('recipient', uuid);
        navigate(`?${searchParams.toString()}`);
    };

    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    useEffect(() => {
        if (channelIDFromUrl) {
            setChannelUUID(channelIDFromUrl);
            fetchChats(channelIDFromUrl);
            const recipientId = localStorage.getItem(channelIDFromUrl);
            if (recipientId) {
                setRecipientId(recipientId);
                setSelectedUser({ userId: recipientId });
            }
        }
    }, [location.search, userId]);

    useEffect(() => {
        const recipientIdFromUrl = new URLSearchParams(location.search).get('recipient');
        if (recipientIdFromUrl) {
            setRecipientId(recipientIdFromUrl);
            setSelectedUser({ userId: recipientIdFromUrl });
        }
    }, [location.search]);

    useEffect(() => {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }, [chats]);

    const chatContainerRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        setSelectedImage(file);

        const reader = new FileReader();
        reader.onload = () => {
            setImageUrl(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const signOut = async () => {
        try {
            await Auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    useEffect(() => {
        fetchChats();
        fetchChatUsers();
        fetchUnreadMessages();
    }, []);

    const fetchChats = async (recipientId) => {
        try {
            const sentMessages = await API.graphql({
                query: queries.listChats,
                variables: {
                    filter: {
                        userId: { eq: userId },
                        recipientId: { eq: recipientId }
                    }
                }
            });

            const receivedMessages = await API.graphql({
                query: queries.listChats,
                variables: {
                    filter: {
                        userId: { eq: recipientId },
                        recipientId: { eq: userId }
                    }
                }
            });

            const allSentChats = sentMessages.data.listChats.items.map(chat => ({
                ...chat,
                isSent: true
            }));

            const allReceivedChats = receivedMessages.data.listChats.items.map(chat => ({
                ...chat,
                isSent: false
            }));

            const allChats = [...allSentChats, ...allReceivedChats];

            setChats(allChats);
        } catch (error) {
            console.error("Error fetching chats:", error);
        }
    };

    const fetchChatUsers = async () => {
        try {
            const response = await API.graphql({ query: queries.listChats });
            const allChats = response.data.listChats.items;

            const uniqueUsers = [...new Set(allChats.flatMap(chat => [chat.userId, chat.recipientId]))];

            const filteredUsersData = uniqueUsers
                .filter(id => id && id !== userId)
                .map(id => {
                    const userChats = allChats.filter(chat => chat.userId === id || chat.recipientId === id);
                    const lastMessageTimestamp = Math.max(...userChats.map(chat => new Date(chat.createdAt).getTime()));
                    return {
                        userId: id,
                        lastMessageTimestamp,
                    };
                })
                .filter(userData => {
                    const userChats = allChats.filter(chat => chat.userId === userData.userId || chat.recipientId === userData.userId);
                    return userChats.some(chat => chat.userId === userId || chat.recipientId === userId);
                })
                .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);

            setChatUsers(filteredUsersData);
        } catch (error) {
            console.error("Error fetching chat users:", error);
        }
    };

    const fetchUnreadMessages = async () => {
        try {
            const unreadMessagesResponse = await API.graphql({
                query: queries.listChats,
                variables: {
                    filter: {
                        recipientId: { eq: userId },
                        isRead: { eq: false }
                    }
                }
            });

            const unreadMessagesById = unreadMessagesResponse.data.listChats.items.reduce((acc, chat) => {
                const { userId } = chat;
                acc[userId] = (acc[userId] || 0) + 1;
                return acc;
            }, {});

            setUnreadMessages(unreadMessagesById);
        } catch (error) {
            console.error("Error fetching unread messages:", error);
        }
    };

    const handleUserClick = async (userId) => {
        setSelectedUser({ userId });
        const channelName = generateChannelName(user.id, userId);
        setChannelUUID(channelName);
        fetchChats(userId, channelName);
        updateRecipientIdInUrl(channelName);

        try {
            const unreadMessagesIds = chats
                .filter(chat => chat.recipientId === user.id && chat.isRead === false)
                .map(chat => chat.id);

            await Promise.all(unreadMessagesIds.map(async id => {
                try {
                    await API.graphql({
                        query: mutations.updateChat,
                        variables: {
                            input: {
                                id: id,
                                isRead: true
                            }
                        }
                    });
                } catch (error) {
                    console.error("Error updating read status:", error);
                }
            }));

            setUnreadMessages(prevState => ({
                ...prevState,
                [userId]: 0
            }));
        } catch (error) {
            console.error("Error updating read status:", error);
        } finally {
            fetchChats(userId);
        }
    };

    const sendMessage = async (uuid) => {
        if (!newMessage.trim() || !selectedUser || !channelUUID) return;
        console.log("Sending message to:", selectedUser.userId); 
        try {
            await API.graphql({
                query: mutations.createChat,
                variables: {
                    input: {
                        text: newMessage.trim(),
                        userId: userId,
                        recipientId: selectedUser.userId,
                        isRead:false,
                        createdAt: currentDate.toISOString(),
                        channelID: channelUUID
                    },
                },
            });
            setNewMessage('');
            setMessageSent(true);
        } catch (error) {
            console.error("Error sending message:", error);
        }
        setShowDate(true);
        setLastMessageDate(currentDate);
        setMessageSent(true);
    };

    const currentDate = new Date();

    useEffect(() => {
        const interval = setInterval(() => {
            setShowDate(prevState => !prevState);
        }, 24 * 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    return (
        <main className="container">
        <h2 className="chat__heading">Messages</h2>
        <section className="chat__container">
        <Pages />
            <div className="chat">
                <article className="chat__message">
                    <article className="chat__figure">
                        <aside className="chat__aside">
                            {/* Placeholder for user information */}
                        </aside>
                        <article className="chat__chatContainer" ref={chatContainerRef}>
                        {chats.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((chat, index, array) => (
    <React.Fragment key={chat.id}>
        {(index === 0 || new Date(chat.createdAt).toDateString() !== new Date(array[index - 1].createdAt).toDateString()) && (
            <p className="chat__date">
                <span>
                    {isToday(new Date(chat.createdAt)) ? "Today" : new Date(chat.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
            </p>
        )}
        <div
            className={`chat__dialog chat__dialog--${chat.userId === user.id ? "user" : "guest"}`}
        >
            {chat.text}
            <span>{chat.userId ? chat.userId.split("@")[0] : 'Unknown User'}</span>
        </div>
    </React.Fragment>
))}


                            {imageUrl && <img src={imageUrl} alt="Selected" style={{ maxWidth: "100%", maxHeight: "200px" }} />}
                        </article>
                        <div className="chat__inputContainer">
                            <input
                                className="chat__input"
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                onKeyUp={(e) => {
                                    if (e.key === "Enter") {
                                        sendMessage(recipientId);
                                    }
                                }}
                            />
                            <button className="chat__send" onClick={() => sendMessage(recipientId)}>Send</button> {/* Adjusted to use recipientId */}
                        </div>
                    </article>
                    <nav className="chat__nav">
                        <div className="chat__buttonWrapper">
                            <button className="chat__button chat__button--review">Send review link</button>
                        </div>
                    </nav>
                </article>
                <article className="chat__people">
                    <ul className="chat__users">
                        {chatUsers.map((chatUser) => (
                            <li className="chat__user" key={chatUser.userId} onClick={() => handleUserClick(chatUser.userId)}>
                                {unreadMessages[chatUser.userId] > 0 && (
                                    <figure className="chat__notification">
                                        {unreadMessages[chatUser.userId] > 9 ? '9+' : unreadMessages[chatUser.userId]}
                                    </figure>
                                )}
                                <div className="chat__pfp">
                                    {/* Placeholder for user profile image */}
                                </div>
                                <div className="chat__wrapper">
                                    <h2 className="chat__name">{chatUser.userId}</h2> {/* Adjusted to use userId */}
                                </div>
                            </li>
                        ))}
                    </ul>
                </article>
            </div>
        </section>
    </main>
    );
};

export default withAuthenticator(Chat);
