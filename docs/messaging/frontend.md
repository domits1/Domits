## Frontend Messaging

This page documents the Web and Mobile messaging implementations.

### Web (React)
- Entry UI: `frontend/web/src/components/messages/ChatScreen.jsx`
  - Fetches history via `useFetchMessages(userId)` and displays messages
  - Sends messages via `useSendMessage(userId)`
  - Subscribes to live updates from `WebSocketContext`
  - Supports local pair rooms for offline/demo via `useLocalRoomMessages`
- Local rooms: `frontend/web/src/components/messages/hooks/useLocalRoomMessages.js`
  - Uses `BroadcastChannel` and `localStorage` to sync tabs
  - Returns `messages`, `addNewMessage`, `sendLocalMessage`
- Send hook: `frontend/web/src/features/hostdashboard/hostmessages/hooks/useSendMessage.js`
  - Builds `{ action: "sendMessage", accessToken, recipientId, text, fileUrls, channelId }`
  - Calls `sendMessage` from websocket service

### Mobile (React Native)
- WebSocket service: `frontend/app/Domits/src/screens/message/services/websocket.js`
  - `connectWebSocket(userId, onMessageReceived)` connects to API Gateway WSS
  - Sends ping every 5 minutes; `sendMessage(message)` and `disconnectWebSocket()` helpers
- Context: `frontend/app/Domits/src/screens/message/context/webSocketContext.jsx`
  - Provides `{ messages, sendMessage }` to the subtree
  - Appends all inbound messages to state
- Hooks:
  - `useSendMessage(userId)`: validates input, derives `channelId`, publishes via WebSocket
  - `useFetchMessages(userId)`: POST to Read-MessagesHistory to fetch ordered history

### Message Shape
Typical outbound payload:

```json
{
  "action": "sendMessage",
  "accessToken": "<jwt>",
  "recipientId": "<user-id>",
  "text": "Hi there",
  "fileUrls": ["https://..."],
  "channelId": "<userId_recipientId>"
}
```

Inbound messages appended by WebSocket include fields like `id`, `userId`, `recipientId`, `text`, `createdAt`, optional `isAutomated`, `messageType`.

### UX Notes
- Optimistic UI adds a temporary sent message, then real-time update replaces/augments it.
- Attachment uploads call `onUploadComplete(url)`; URLs are sent as `fileUrls`.
- Automated messages display indicators when `isAutomated === true` and `messageType` is set.

