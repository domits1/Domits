// import { createContext, useEffect, useState } from "react";
// import { connectWebSocket, sendMessage, disconnectWebSocket } from "../services/websocket";

// export const WebSocketContext = createContext();

// export const WebSocketProvider = ({ userId, children }) => {
//     const [messages, setMessages] = useState([]);

//     useEffect(() => {
//         if (userId) {
//             connectWebSocket(userId, (message) => {
//                 setMessages((prev) => [...prev, message]);
//             });
//         }

//         return () => {
//             disconnectWebSocket();
//         };
//     }, [userId]);

//     return (
//         <WebSocketContext.Provider value={{ messages, sendMessage }}>
//             {children}
//         </WebSocketContext.Provider>
//     );
// };
