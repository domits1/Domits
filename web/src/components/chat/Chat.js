import React from "react";
import "./chatbox.css";

const Chat = () => {
    return (
        <div className="chat">
            <div className="button_containerc">
                <button type="button" className="buttonc">Start New Chat</button>
            </div>

            <div className="chat_box">
                <div className="flex-auto rounded-md p-3 ring-1 ring-inset ring-gray-200 w-3/4 my-2 self-end bg-gray-200">
                    <div>
                        <div className="">
                            <div className="username">
                                <span className="username-name">Username</span>{" "}
                            </div>
                            <time dateTime="2023-01-23T15:56" className="time">
                                2 minutes ago
                            </time>
                        </div>
                        <p className="text">
                            This is a message text. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                        </p>
                    </div>
                </div>
            </div>

            <div className="input_form">
                <input type="text" name="search" id="search" className="inputchat" />
                <div className="chat-enter">
                    <kbd>Enter</kbd>
                </div>
            </div>

            <div className="button_containerc">
                <button type="button" className="buttonc">Sign Out</button>
            </div>
        </div>
    );
}

export default Chat;
