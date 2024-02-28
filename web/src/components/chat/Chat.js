import React from "react";
import "./chatbox.css";

const Chat = () => {
    return (
        <div className="chat">
            <div className="chat_box">
                <div className="flex-auto rounded-md p-3 ring-1 ring-inset ring-gray-200 w-3/4 my-2 self-end bg-gray-200">
                    <div>
                        <div className="">
                            <div className="name">
                                <span className="name">name</span>{" "}
                            </div>
                            <time dateTime="2023-01-23T15:56" className="time">
                                2 minutes ago
                            </time>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="689" height="2" viewBox="0 0 689 2" fill="none">
                            <path d="M1 1L688 0.99994" stroke="black" stroke-width="0.5" stroke-linecap="round"/>
                        </svg>
                        <p className="text">
                            You got an amazing place and we are loving it!
                        </p>
                    </div>
                </div>
                <div className="input_container">
                    <input type="text" className="input_field" placeholder="Type your message here..." style={{width: "687px", height: "45px", borderRadius: "15px", border: "0.5px solid #000"}} />
                    <button type="button" className="send_button">Send</button>
                </div>
            </div>



            <span className="button_container">
                <button type="button" className="">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 3H15M3 6H21M19 6L18.2987 16.5193C18.1935 18.0975 18.1409 18.8867 17.8 19.485C17.4999 20.0118 17.0472 20.4353 16.5017 20.6997C15.882 21 15.0911 21 13.5093 21H10.4907C8.90891 21 8.11803 21 7.49834 20.6997C6.95276 20.4353 6.50009 20.0118 6.19998 19.485C5.85911 18.8867 5.8065 18.0975 5.70129 16.5193L5 6M10 10.5V15.5M14 10.5V15.5" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </span>

            <span className="button_container">
                <button type="button" className="">
                    <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M10.9932 3.13581C8.9938 0.7984 5.65975 0.169643 3.15469 2.31001C0.649644 4.45038 0.296968 8.02898 2.2642 10.5604C3.89982 12.6651 8.84977 17.1041 10.4721 18.5408C10.6536 18.7016 10.7444 18.7819 10.8502 18.8135C10.9426 18.8411 11.0437 18.8411 11.1361 18.8135C11.2419 18.7819 11.3327 18.7016 11.5142 18.5408C13.1365 17.1041 18.0865 12.6651 19.7221 10.5604C21.6893 8.02898 21.3797 4.42787 18.8316 2.31001C16.2835 0.192157 12.9925 0.7984 10.9932 3.13581Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </span>

            <span className="button_container"><button type="button" className="buttonc add-files-button">Add files</button></span>
            <span className="button_container"><button type="button" className="buttonc send-review-link">Send reviewlink</button></span>


        </div>
    );
}

export default Chat;
