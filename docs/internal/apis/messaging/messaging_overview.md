## Messaging Overview

Domits provides real-time messaging between hosts and guests with automated system messages tied to bookings.

- **Transport**: WebSocket API (AWS API Gateway) for realtime; HTTPS endpoints for message creation/history.
- **Clients**: Web (React) and Mobile (React Native) UIs share a similar flow.
- **Automation**: Booking-triggered templates (check-in, Wi‑Fi, check-out, booking confirmation).

See also: `unified_messaging_layer.md`.

### Architecture
- **Frontend (Web)**: `ChatScreen.jsx`, hooks for send/fetch, `WebSocketContext` for live updates.
- **Frontend (Mobile)**: `websocket.js`, `WebSocketProvider`, `useSendMessage`, `useFetchMessages`.
- **Backend**: API Gateway routes for create (WebSocket message) and read (history), plus automation service in bookings domain.

### Key Files
- Web (selected): `frontend/web/src/components/messages/ChatScreen.jsx`
- Web hooks: `frontend/web/src/features/hostdashboard/hostmessages/hooks/useSendMessage.js`
- Web local rooms: `frontend/web/src/components/messages/hooks/useLocalRoomMessages.js`
- Mobile WebSocket: `frontend/app/Domits/src/screens/message/services/websocket.js`
- Mobile context: `frontend/app/Domits/src/screens/message/context/webSocketContext.jsx`
- Mobile hooks: `frontend/app/Domits/src/screens/message/Hooks/useSendMessage.js`, `useFetchMessages.js`
- Automation demo/tests: `demo-automated-messages.js`, `run-immediate-messaging-test.js`, `backend/test/messaging-integration.test.js`

### Flows
1) User opens a chat → client fetches history via HTTPS → renders messages.
2) User sends message → client posts to Create-WebSocketMessage → backend dispatches to recipient via WebSocket.
3) Realtime updates → recipient’s client receives message on open socket and appends to chat.
4) Automated messages → booking events trigger predefined messages sent through the same pipeline.

See also: `../frontend/web_chat.md`.

