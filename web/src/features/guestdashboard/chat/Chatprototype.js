import React, { useEffect, useState, useRef  } from "react";
import "./chat.css";
import img1 from './image22.png';
import heart from './Icon.png';
import trash from './Icon-1.png';
import smile from './smile.png';
import users from './users.png';
import home from './home.png';
import calendar from './calendar.png';
import card from './card.png';
import django from './django.png';
import jan from './jan.png';
import eye from './eye.png';
import alert from './alert.png';
import Pages from "../Pages";
import { API, graphqlOperation } from "aws-amplify";
import { withAuthenticator } from "@aws-amplify/ui-react";
import * as mutations from "../../../graphql/mutations";
import * as queries from "../../../graphql/queries";
import * as subscriptions from "../../../graphql/subscriptions";
import { Auth } from 'aws-amplify';
import { useLocation, useNavigate, Link } from 'react-router-dom';

function showMessages() {
    var screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

    if (screenWidth < 1277) {
        var chatPeople = document.querySelector('.chat__people');
        var chatMessage = document.querySelector('.chat__message');

        chatPeople.style.display = 'none';
        chatMessage.style.display = 'block';
    }
}

const Chat = ({ user }) => {
    const [chats, setChats] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [messageSent, setMessageSent] = useState(false);
    const [showDate, setShowDate] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState({});
    const [lastMessageDate, setLastMessageDate] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null); // State to store the selected image file
    const [imageUrl, setImageUrl] = useState("");
    const [recipientEmail, setRecipientEmail] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [chatUsers, setChatUsers] = useState([]);


    useEffect(() => {
    const subscription = API.graphql(
        graphqlOperation(subscriptions.onCreateChat)
    ).subscribe({
        next: ({ provider, value }) => {
            // Handle new chat message
            const newChat = value.data.onCreateChat;
            setChats(prevChats => [...prevChats, newChat]);
        },
        error: error => console.error("Subscription error:", error)
    });

    return () => subscription.unsubscribe();
}, []);


    const navigate = useNavigate(); // Get the navigate function
    const location = useLocation();
    const recipientEmailFromUrl = new URLSearchParams(location.search).get('recipient');
    const channelUUID = new URLSearchParams(location.search).get('channel');

    // Function to update the URL with the recipient's email


    const updateRecipientEmailInUrl = (email) => {
        const uuid = generateUUID();
        const searchParams = new URLSearchParams(location.search);
        searchParams.set('recipient', uuid);
        navigate(`?${searchParams.toString()}`);
    };

    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    useEffect(() => {
        // Set recipientEmail when it's available in the URL
        const recipientEmailFromUrl = new URLSearchParams(location.search).get('recipient');
        if (recipientEmailFromUrl) {
            setRecipientEmail(recipientEmailFromUrl);
        }
    }, [location.search]);

  useEffect(() => {
    // Scroll chat container to bottom when component mounts or chats state updates
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
}, [chats]);

// Reference to the chat container
const chatContainerRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        setSelectedImage(file);

        const reader = new FileReader();
        reader.onload = () => {
            setImageUrl(reader.result); // Set the URL of the selected image
        };
        reader.readAsDataURL(file); // Read the selected file as a data URL
    };


    const signOut = async () => {
        try {
            await Auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const signUp = async () => {
        try {

            const { user } = await Auth.signUp({
                username: 'username',
                password: 'password',
                attributes: {

                    email: 'email@example.com'
                }
            });
            console.log("New user signed up:", user);
        } catch (error) {
            console.error("Error signing up:", error);
        }
    };


    useEffect(() => {
        fetchChats();
        fetchChatUsers();
        fetchUnreadMessages();
    }, []);

    const fetchChats = async (recipientEmail) => {
        try {
            const sentMessages = await API.graphql({
                query: queries.listChats,
                variables: {
                    filter: {
                        email: { eq: user.attributes.email },
                        recipientEmail: { eq: recipientEmail }
                    }
                }
            });

            const receivedMessages = await API.graphql({
                query: queries.listChats,
                variables: {
                    filter: {
                        email: { eq: recipientEmail },
                        recipientEmail: { eq: user.attributes.email }
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

            console.log("Sent messages:", allSentChats);
            console.log("Received messages:", allReceivedChats);

            setChats(allChats);
        } catch (error) {
            console.error("Error fetching messages:", error);
        }
    };


    const fetchChatUsers = async () => {
        try {
            const response = await API.graphql({ query: queries.listChats });
            const allChats = response.data.listChats.items;
            const uniqueUsers = [...new Set(allChats.flatMap(chat => [chat.email, chat.recipientEmail]))];

            // Filter out null or undefined values
            const filteredUsers = uniqueUsers.filter(email => email && email !== user.attributes.email);

            const usersData = filteredUsers.map(email => {
                const userChats = allChats.filter(chat => chat.email === email || chat.recipientEmail === email);
                const lastMessageTimestamp = Math.max(...userChats.map(chat => new Date(chat.createdAt).getTime()));
                return {
                    email,
                    lastMessageTimestamp,
                };
            });

            // Filter out users who haven't exchanged messages with you
            const filteredUsersData = usersData.filter(userData => {
                const userChats = allChats.filter(chat => chat.email === userData.email || chat.recipientEmail === userData.email);
                return userChats.some(chat => chat.email === user.attributes.email || chat.recipientEmail === user.attributes.email);
            });

            const sortedUsersData = filteredUsersData.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);

            setChatUsers(sortedUsersData);
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
                        recipientEmail: { eq: user.attributes.email },
                        isRead: { eq: false }
                    }
                }
            });

            const unreadMessagesByEmail = unreadMessagesResponse.data.listChats.items.reduce((acc, chat) => {
                const { email } = chat;
                acc[email] = (acc[email] || 0) + 1;
                return acc;
            }, {});

            setUnreadMessages(unreadMessagesByEmail);
        } catch (error) {
            console.error("Error fetching unread messages:", error);
        }
    };

    const handleUserClick = async (email) => {
        setRecipientEmail(email);
        setSelectedUser(chatUsers.find(user => user.email === email));
        fetchChats(email);
        updateRecipientEmailInUrl(email);

        try {
            const unreadMessagesIds = chats
                .filter(chat => chat.recipientEmail === user.attributes.email && chat.isRead === false)
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
                [email]: 0
            }));
        } catch (error) {
            console.error("Error updating read status:", error);
        } finally {

            fetchChats(email);
        }
    };




    const sendMessage = async () => {
        if (!newMessage.trim() || !recipientEmail) return;
        try {
            await API.graphql({
                query: mutations.createChat,
                variables: {
                    input: {
                        text: newMessage.trim(),
                        email: user.attributes.email,
                        recipientEmail: selectedUser.email,
                        isRead: false,
                        createdAt: currentDate.toISOString()
                    },
                },
            });
            setNewMessage('');
            fetchChats(selectedUser.email);
        } catch (error) {
            console.error("Error sending message:", error);
        }
        setShowDate(true);
        setLastMessageDate(currentDate);
        setMessageSent(true);
    };

    const currentDate = new Date();

    const options = { month: 'long', day: 'numeric' };

    const formattedDate = currentDate.toLocaleDateString('en-US', options);






    useEffect(() => {
        console.log("Unread messages:", unreadMessages);
    }, [unreadMessages]);

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    useEffect(() => {
        const interval = setInterval(() => {
            // Force re-render by updating state
            setShowDate(prevState => !prevState);
        }, 24 * 60 * 60 * 1000); // 24 hours

        return () => clearInterval(interval);
    }, []);



    return (
        <main className="chat">
            <div className="chat__headerWrapper">

                <h2 className="chat__heading">Message dashboard</h2>
            </div>
            <section className="chat__container">
               <Pages/>


                <article className="chat__message">
                    <article className="chat__figure">
                        <aside className="chat__aside">
                            <div className="chat__pfpSecond">
                                <img src={img1} className="chat__pfpImg"/>
                            </div>
                            <ul className="chat__list">
                                <li className="chat__listItem">
                                    <h2 className="chat__name">{selectedUser ? selectedUser.email : ''}</h2>
                                </li>
                                <li className="chat__listItem">
                                    <img src={smile}/>
                                    <p className="chat__listP">3rd all-time booker</p>
                                </li>
                                <li className="chat__listItem">
                                    <img src={users}/>
                                    <p className="chat__listP">2 adults, 2 kids</p>
                                </li>
                                <li className="chat__listItem">
                                    <img src={home}/>
                                    <p className="chat__listP">Kinderhuissingel 6k</p>
                                </li>
                                <li className="chat__listItem">
                                    <img src={calendar}/>
                                    <p className="chat__listP">21-12-2023 / 28-12-2023</p>
                                </li>
                                <li className="chat__listItem">
                                    <img src={card}/>
                                    <p className="chat__listP">paid with mastercard</p>
                                </li>
                            </ul>
                        </aside>
                        <article className="chat__chatContainer"  ref={chatContainerRef}>
                        {chatUsers.length === 0 && (
        <article className="chat__default">
            <p className="chat__defaultmsg">You have no conversations yet. Initiate a conversation by viewing listings.</p>
            <p className="chat__cta">
                <Link target="_blank" to="/">Go to listings</Link>
            </p>
        </article>
    )}
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
            className={`chat__dialog chat__dialog--${chat.email === user.attributes.email ? "user" : "guest"}`}
        >
            {chat.text}
            <span>{chat.email.split("@")[0]}</span>
        </div>
    </React.Fragment>
))}
{imageUrl && <img src={imageUrl} alt="Selected" style={{ maxWidth: "100%", maxHeight: "200px" }} />} {/* Display the selected image */}

                            </article>

                    <input
                        className="chat__input"
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        onKeyUp={(e) => {
                            if (e.key === "Enter") {
                                sendMessage();
                            }
                        }}
                    />
                    {/* <input
                        className="chat__recipientInput"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="Recipient's email..."
                    /> */}
                                        <button onClick={sendMessage}>Send</button>


                    </article>
                    <nav className="chat__nav">
                    <ul className="chat__controls">
                        <li className="chat__control chat__control--icon">
                            <img className="chat__icon" src={heart}/>
                        </li>
                        <li className="chat__control chat__control--icon">
                            <img className="chat__icon" src={trash}/>
                        </li>
                    </ul>
                    <div className="chat__buttonWrapper">
                    <button className="chat__button chat__button--file">add files
                    <input type="file" onChange={handleImageUpload} /></button>
                    <button className="chat__button chat__button--review">Send review link</button>

                    </div>
                    </nav>
                </article>
                <article className="chat__people">
                <ul className="chat__users">
                {chatUsers.map((chatUser) => (
    <li className="chat__user" key={chatUser.email} onClick={() => handleUserClick(chatUser.email)}>
        {unreadMessages[chatUser.email] > 0 && (
            <figure className="chat__notification">
                {unreadMessages[chatUser.email] > 9 ? '9+' : unreadMessages[chatUser.email]}
            </figure>
        )}
        <div className="chat__pfp">
            <img src={chatUser.profilePic} className="chat__img" alt="Profile"/>
        </div>
        <div className="chat__wrapper">
            <h2 className="chat__name">{chatUser.email}</h2>
            {/* Display last message preview here */}
        </div>
    </li>
))}

                </ul>
            </article>
            </section>
        </main>
    );
}

export default withAuthenticator(Chat);
