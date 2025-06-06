// import React, { useState, ReactElement } from "react";
// import { useChatBackend } from "./ChatBackend";
// import { useUser } from "../../context/UserContext";
//
// const JoinChat: React.FC = (signOut): ReactElement => {
//     const { user } = useUser();
//     const {
//         recipientEmail,
//         setShowJoinButton,
//         showAlert,
//         handleStartNewChat,
//         handleAlertInputChange,
//         handleAlertConfirm,
//         handleAlertCancel,
//     } = useChatBackend(user, signOut); // Timo: sends the user from ../../context/UserContext into useChatBackend users
//     return (
//         <>
//             <div>
//                 <div className="button_containerc">
//                     <button
//                         type="button"
//                         className="buttonc"
//                         onClick={handleStartNewChat}
//                     >
//                         Start New Chat
//                     </button>
//                 </div>
//
//                 {
//                     // @ts-ignore
//                     showAlert && (
//                         <div className="alert">
//                             <input
//                                 type="text"
//                                 placeholder="Enter recipient's email"
//                                 value={recipientEmail}
//                                 onChange={handleAlertInputChange}
//                             />
//                             <button
//                                 onClick={() => {
//                                     handleAlertConfirm();
//                                     setShowJoinButton(true);
//                                 }}
//                             >
//                                 Confirm
//                             </button>
//                             <button onClick={handleAlertCancel}>Cancel</button>
//                         </div>
//                     )
//                 }
//             </div>
//         </>
//     );
// };
//
// export default JoinChat;