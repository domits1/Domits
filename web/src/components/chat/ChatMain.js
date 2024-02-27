import React from "react";
import "./chatbox.css";

function ChatMain() {
    return (
        <div>
            <div className="button_containerc">
                <button type="button" className="buttonc">
                    Start New Chat
                </button>
            </div>

            <div className="">
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
                <div>
                    <div className="input_form">
                        <input
                            type="text"
                            name="search"
                            id="search"
                            className="inputchat"
                        />
                        <div className="chat-enter">
                            <kbd className="">Enter</kbd>
                        </div>
                    </div>
                </div>
            </div>
            <div className="button_containerc">
                <button type="button" className="buttonc">
                    Sign Out
                </button>
            </div>
        </div>
    );
}

export default ChatMain;



// // // Chat2.tsx
// import { withAuthenticator } from "@aws-amplify/ui-react";
// import React, { useEffect } from "react";
// import * as mutations from "../../graphql/mutations";
// import { API, graphqlOperation } from "aws-amplify";
// import * as queries from "../../graphql/queries";
// import intlFormatDistance from "date-fns/intlFormatDistance";
// import * as subscriptions from "../../graphql/subscriptions";
// import { useChatBackend } from "./ChatBackend";
// import "./chatbox.css";
//
// function ChatMain({ user, signOut }) {
//     const {
//         chats,
//         setChats,
//         recipientEmail,
//         recentMessageEmail,
//         showJoinButton,
//         setShowJoinButton,
//         showConfirmedConnection,
//         showAlert,
//         notificationMessage,
//         handleStartNewChat,
//         handleSendMessage,
//         handleAlertInputChange,
//         handleAlertConfirm,
//         handleAlertCancel,
//         handleJoinChat,
//         handleReceivedMessage,
//     } = useChatBackend(user, signOut);
//
//     useEffect(() => {
//         async function fetchChats() {
//             const allChats = await API.graphql({
//                 query: queries.listChats,
//                 variables: {
//                     filter: {
//                         members: { contains: user.attributes.email },
//                     },
//                 },
//             });
//             // @ts-ignore
//             setChats(allChats.data.listChats.items);
//         }
//         fetchChats();
//     }, [user.attributes.email]);
//
//     useEffect(() => {
//         console.log("Checking for new messages...");
//         const sub = API.graphql(
//             graphqlOperation(subscriptions.onCreateChat)
//             // @ts-ignore
//         ).subscribe({
//             next: ({ value }) => {
//                 console.log("Received a new message:", value.data.onCreateChat);
//                 handleReceivedMessage(value.data.onCreateChat);
//             },
//             error: (err) => console.log(err),
//         });
//         return () => sub.unsubscribe();
//     }, [user.attributes.email]);
//
//     return (
//         <div>
//             <div className="button_containerc">
//                 <button type="button" className="buttonc" onClick={handleStartNewChat}>
//                     Start New Chat
//                 </button>
//             </div>
//
//             <div className="">
//                 <div className="chat_box">
//                     {chats
//                         // @ts-ignore
//                         .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
//                         .map((chat) => (
//                             <div
//                                 // @ts-ignore
//                                 key={chat.id}
//                                 className={`flex-auto rounded-md p-3 ring-1 ring-inset ring-gray-200 w-3/4 my-2 ${
//                                     // @ts-ignore
//                                     chat.email === user.attributes.email && "self-end bg-gray-200"
//                                 }`}
//                             >
//                                 <div>
//                                     <div className="">
//                                         <div className="username">
//                       <span className="username-name">
//                         {
//                             // @ts-ignore
//                             chat.email.split("@")[0]
//                         }
//                       </span>{" "}
//                                         </div>
//                                         <time dateTime="2023-01-23T15:56" className="time">
//                                             {
//                                                 // @ts-ignore
//                                                 intlFormatDistance(new Date(chat.createdAt), new Date())
//                                             }
//                                         </time>
//                                     </div>
//                                     <p className="text">
//                                         {
//                                             // @ts-ignore
//                                             chat.text
//                                         }
//                                     </p>
//                                 </div>
//                             </div>
//                         ))}
//                 </div>
//                 <div>
//                     <div className="input_form">
//                         <input
//                             type="text"
//                             name="search"
//                             id="search"
//                             onKeyUp={async (e) => {
//                                 if (e.key === "Enter") {
//                                     // @ts-ignore
//                                     const messageText = e.target.value;
//                                     if (messageText && recipientEmail) {
//                                         await handleSendMessage(messageText);
//                                         // @ts-ignore
//                                         e.target.value = "";
//                                     }
//                                 }
//                             }}
//                             className="inputchat"
//                         />
//                         <div className="chat-enter">
//                             <kbd className="">Enter</kbd>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div className="button_containerc">
//                 <button type="button" className="buttonc" onClick={() => signOut()}>
//                     Sign Out
//                 </button>
//             </div>
//             {showAlert && (
//                 <div className="alert">
//                     <input
//                         type="text"
//                         placeholder="Enter recipient's email"
//                         value={recipientEmail}
//                         onChange={handleAlertInputChange}
//                     />
//                     <button
//                         onClick={() => {
//                             handleAlertConfirm();
//                             setShowJoinButton(true);
//                         }}
//                     >
//                         Confirm
//                     </button>
//                     <button onClick={handleAlertCancel}>Cancel</button>
//                 </div>
//             )}
//
//             {showJoinButton &&
//                 user.attributes.email !== recentMessageEmail &&
//                 !showConfirmedConnection && (
//                     <div className="button_containerc">
//                         <button type="button" className="buttonc" onClick={handleJoinChat}>
//                             Join Chat
//                         </button>
//                     </div>
//                 )}
//
//             {showConfirmedConnection && (
//                 <div>
//                     {/* Render a notification message */}
//                     <p>{notificationMessage}</p>
//                     {/* You can render a message or button to indicate that the user has joined the chat */}
//                     <p>You have joined the chat</p>
//                 </div>
//             )}
//         </div>
//     );
// }
//
// export default withAuthenticator(ChatMain);