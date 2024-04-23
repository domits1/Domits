import "./chatprototype.css";
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
import Pages from "../guestdashboard/Pages";
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { withAuthenticator } from "@aws-amplify/ui-react";
import * as mutations from "../../graphql/mutations";
import * as queries from "../../graphql/queries";
import { Auth } from 'aws-amplify';

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
    const [recipientEmail, setRecipientEmail] = useState('');
    const [messageSent, setMessageSent] = useState(false);
    const [showDate, setShowDate] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState({}); 
    const [lastMessageDate, setLastMessageDate] = useState(null);

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
        fetchUnreadMessages();
    }, [recipientEmail]);


    const fetchChats = async () => {
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
            const allChats = [...sentMessages.data.listChats.items, ...receivedMessages.data.listChats.items];
            setChats(allChats);
        } catch (error) {
            console.error("Error fetching chats:", error);
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
        fetchChats(email); 
    
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
                        recipientEmail: recipientEmail.trim(),
                        isRead: false,
                        createdAt: currentDate.toISOString()
                    },
                },
            });
            setNewMessage('');
            fetchChats(recipientEmail);
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



  
    const chatUsers = [
        { email: '33580@ma-web.nl', name: 'Sheima Mahmoudi', profilePic: {img1}, lastMessage: 'You got an amazing place and we are loving it!' },
        { email: 'nabilsalimi0229@gmail.com', name: 'Django Wagner', profilePic: './django.png', lastMessage: 'Happy to hear the stay is going great' },
    ];

    useEffect(() => {
        console.log("Unread messages:", unreadMessages);
    }, [unreadMessages]);
    
    


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
                                    <h2 className="chat__name">{recipientEmail}</h2>
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
                        <article className="chat__chatContainer">
                        {chats.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((chat, index, array) => (
        <React.Fragment key={chat.id}>
            {(index === 0 || new Date(chat.createdAt).toDateString() !== new Date(array[index - 1].createdAt).toDateString()) && (
                <p className="chat__date">
                    <span>{new Date(chat.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
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
                    <button className="chat__button chat__button--file">add files</button>
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
                                <h2 className="chat__name">{chatUser.name}</h2>
                                <p className="chat__preview">{chatUser.lastMessage}</p>
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