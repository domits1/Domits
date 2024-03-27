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
    const [notifications, setNotifications] = useState({});
    const [sentMessagesCount, setSentMessagesCount] = useState(0); // Track sent messages count

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

            // Update recipient's notifications based on received messages
            setNotifications(prevNotifications => ({
                ...prevNotifications,
                [recipientEmail]: receivedMessages.data.listChats.items.length
            }));
        } catch (error) {
            console.error("Error fetching chats:", error);
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
                    },
                },
            });
            setNewMessage('');
            setMessageSent(true);
            setSentMessagesCount(sentMessagesCount + 1); // Increment sent messages count
            // Fetch new chats and update notifications after sending the message
            fetchChats(recipientEmail).then(() => {
                // Update notifications after chats are fetched and set
                setNotifications(prevNotifications => ({
                    ...prevNotifications,
                    [recipientEmail]: (prevNotifications[recipientEmail] || 0) + 1 // Increment notification count
                }));
            });
        } catch (error) {
            console.error("Error sending message:", error);
        }
        setShowDate(true);
    };

    const handleUserClick = (email) => {
        console.log("Recipient Email:", email); 
        setRecipientEmail(email);
        fetchChats(email);
        setNotifications(prevNotifications => ({
            ...prevNotifications,
            [email]: 0 // Reset notifications for the opened chat
        }));
        showMessages();
    };

    return (
        <main className="chat">
            <div className="chat__headerWrapper">
            <button onClick={signOut}>Log Out</button>
                        <button onClick={signUp}>Create New User</button>
                <h2 className="chat__heading">Message dashboard</h2>
            </div>
            <section className="chat__container">
                <article className="chat__sidebar">
                    <ul className="chat__mobileUl">
                        <li className="chat__topLi">
                            <div className="chat__liIcon">
                                <img src={heart}/>
                            </div>
                            <p className="chat__iconText">Favourites</p>
                        </li>
                        <li className="chat__topLi">
                            <div className="chat__liIcon">
                                <img src={home}/>
                            </div>
                            <p className="chat__iconText">Guests</p>
                        </li>
                        <li className="chat__topLi">
                            <div className="chat__liIcon">
                                <img src={eye}/>
                            </div>
                            <p className="chat__iconText">Accomm. viewers</p>
                            <div className="chat__liIcon">
                                <img src={trash}/>
                            </div>
                            <p className="chat__iconText">Deleted</p>
                            <div className="chat__liIcon">
                                <img src={alert}/>
                            </div>
                            <p className="chat__iconText">Add moderator</p>
                        </li>
                    </ul>
                    <ul className="chat__topUl">
                        <li className="chat__topLi">
                            <div className="chat__liIcon">
                                <img src={heart}/>
                            </div>
                            <p className="chat__iconText">Favourites</p>
                        </li>
                        <li className="chat__topLi">
                            <div className="chat__liIcon">
                                <img src={home}/>
                            </div>
                            <p className="chat__iconText">Guests</p>
                        </li>
                        <li className="chat__topLi">
                            <div className="chat__liIcon">
                                <img src={eye}/>
                            </div>
                            <p className="chat__iconText">Accomm. viewers</p>
                        </li>
                    </ul>
                    <ul className="chat__midUl">
                        <li className="chat__topLi">
                            <div className="chat__liIcon">
                                <img src={trash}/>
                            </div>
                            <p className="chat__iconText">Deleted</p>
                        </li>
                    </ul>
                    <ul className="chat__bottomUl">
                        <li className="chat__bottomLi chat__bottomLi--text">Need some assistance in<br></br>your messages with you<br></br>tenants?</li>
                        <li className="chat__topLi">
                            <div className="chat__liIcon">
                                <img src={alert}/>
                            </div>
                            <p className="chat__iconText">Add moderator</p>
                        </li>
                    </ul>
                </article>
                <article className="chat__people">
                    <ul className="chat__users">
                        <li className="chat__user" onClick={() => handleUserClick('33580@ma-web.nl')}>
                        <figure className="chat__notification">{notifications['33580@ma-web.nl']}</figure>
                            <div className="chat__pfp">
                                <img src={img1} className="chat__img"/>
                            </div>
                            <div className="chat__wrapper">
                                <h2 className="chat__name">Sheima Mahmoudi</h2>
                                <p className="chat__preview">You got an amazing place and <br></br> we are loving it!</p>
                            </div>
                        </li>
                        <li className="chat__user" onClick={() => handleUserClick('nabilsalimi0229@gmail.com')}>
                            <figure className="chat__notification">{notifications['nabilsalimi0229@gmail.com']}</figure>
                            <div className="chat__pfp"><img src={django} className="chat__img"/></div>
                            <div className="chat__wrapper">
                                <h2 className="chat__name">Django Wagner</h2>
                                <p className="chat__preview">Happy to hear the stay is<br></br>going great</p>
                            </div>
                        </li>
                        <li className="chat__user">
                            <figure className="chat__notification">9+</figure>
                            <div className="chat__pfp"><div className="chat__pfp"><img src={jan} className="chat__img"/></div></div>
                            <div className="chat__wrapper">
                                <h2 className="chat__name">Jan Smit</h2>
                                <p className="chat__preview">Ik kom zo langs om eieren<br></br>te gooien op dat hoofd...</p>
                            </div>
                        </li>
                    </ul>
                </article>
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
                        {messageSent && (
                <p className="chat__date">
                    <span>March 19</span>
                </p>
            )}
                        <div className="chat__messages">
                        {chats.slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((chat) => (
                            <div
                                key={chat.id}
                                className={`chat__dialog chat__dialog--${
                                    chat.email === user.attributes.email ? "user" : "guest"
                                }`}
                            >
                                {chat.text}
                                <span>{chat.email.split("@")[0]}</span>
                            </div>
                        ))}
                    </div>
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
            </section>
        </main>
    );
}

export default withAuthenticator(Chat);
