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
import React, { useEffect } from "react";
import { API } from "aws-amplify";
import * as mutations from "../../graphql/mutations";
import "@aws-amplify/ui-react/styles.css";
import { withAuthenticator } from "@aws-amplify/ui-react";
import * as queries from "../../graphql/queries";







function showMessages() {
    var screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

    if (screenWidth < 1277) {
        var chatPeople = document.querySelector('.chat__people');
        var chatMessage = document.querySelector('.chat__message');

        chatPeople.style.display = 'none';

        chatMessage.style.display = 'block';
    }
}




const Chat = ({ user, signOut  }) => {
    const [chats, setChats] = React.useState([]);
    React.useEffect(() => {
        async function fetchChats() {
          const allChats = await API.graphql({
            query: queries.listChats,
          });
          console.log(allChats.data.listChats.items);
          setChats(allChats.data.listChats.items);
        }
        fetchChats();
      }, []);
    return (
        <main className="chat">
            <div className="chat__headerWrapper">
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
                        <li className="chat__user" onClick={showMessages}>
                            <div className="chat__pfp">
                                <img src={img1} className="chat__img"/>
                            </div>
                            <div className="chat__wrapper">
                                <h2 className="chat__name">Sheima Mahmoudi</h2>
                                <p className="chat__preview">You got an amazing place and <br></br> we are loving it!</p>
                            </div>
                        </li>
                        <li className="chat__user">
                            <figure className="chat__notification">1</figure>
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
                                    <h2 className="chat__name">Sheima Mahmoudi</h2>
                                </li>
                                <li className="chat__listItem">
                                <img src={smile}/>
                                    <p className="chat__listP">
                                      3rd all-time booker</p>
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
                            <div className="chat__messages">
                                {/* <article className="chat__dialog chat__dialog--guest">{chats}</article> */}
                                {chats
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  .map((chat) => (
    <div
      key={chat.id}
      className={`chat__dialog chat__dialog--${
        chat.email === user.attributes.email && "user"
      }`}
    >
         {chat.text}
          {/* <article className="chat__dialog chat__dialog--user"></article> */}
          <span>
                        {chat.email.split("@")[0]}
                      </span>{" "}
    </div>
  ))}
    

                                {/* <article className="chat__dialog chat__dialog--user">Thanks so much, we are doing everything we can to make sure your family has a wonderful time!</article>
                                <article className="chat__dialog chat__dialog--guest">That is super sweet, thanks a lot :D</article>
                                <article className="chat__dialog chat__dialog--user">Sounds like a 5 star review might be incoming for us?!</article>
                                <article className="chat__dialog chat__dialog--guest">Oh! You can count on that for sure... send me the review link please!</article>
                                <article className="chat__dialog chat__dialog--user">test message user test message user</article> */}
                            </div>
                            <input className="chat__input"  type="text" name="search" id="search"
onKeyUp={async (e) => {
    if (e.key === "Enter") {
        if (user && user.attributes && user.attributes.email) {
            await API.graphql({
                query: mutations.createChat,
                variables: {
                    input: {
                        text: e.target.value,
                        email: user.attributes.email,
                    },
                },
            });
            e.target.value = "";
        } else {
            console.error("User not authenticated or missing email");
        }
    }
}}
                />
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
