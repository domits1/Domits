# Unified Messaging Layer (Current Implementation)

## Purpose
This document describes the current unified messaging implementation in the Domits codebase (Web + Mobile), including realtime delivery via WebSocket, message history retrieval, contact list retrieval, and the canonical payload shapes used by clients.

## High-level Architecture
- **Realtime transport**
  - **WebSocket (AWS API Gateway WebSocket)**
  - Web + Mobile connect to the same WSS endpoint and receive inbound message payloads on the open socket.
- **Message history + supporting data**
  - Retrieved via HTTPS endpoints (API Gateway / Lambda).
- **Clients**
  - **Web (React)** messaging UI is built around `ContactList` + `ChatScreen`, backed by hooks for contacts/history and a shared `WebSocketContext` provider.
  - **Mobile (React Native)** uses an analogous `WebSocketProvider` + hooks for contacts/history and message sending.

## Current state (what already exists)
- **Backend**
  - Baseline communication services and API surface are in place.
  - Authentication and role separation are already handled.
  - Notifications exist, but are not yet end-to-end unified across channels.
- **Frontend**
  - Chat UI exists.
  - Reusable patterns exist for listing/property context, reservations, and conversation/channel identifiers.
- **Infrastructure**
  - AWS environment is in place.
  - Queues and webhooks are already used in other parts of the platform and can be leveraged for messaging integrations.

## Roadmap (what still needs to be built)
The goal is to support external channel messaging (e.g. Airbnb, Booking.com, VRBO) through a single internal interface.

- **Unified Messaging Layer**
  - Define a canonical message schema.
  - Implement thread/conversation logic.
  - Implement inbound + outbound handlers.
  - Add retry strategy and idempotency (deduplication).
- **Channel adapters**
  - Airbnb adapter: OAuth, fetch messages, send messages, map to unified schema.
  - Booking.com adapter: client-credentials auth, polling vs push strategy, map to unified schema.
  - VRBO adapter: implement what their API allows; define fallback strategy for gaps.
- **Frontend Inbox**
  - Thread list view + detail view.
  - Send messages.
  - Delivery/read/status updates.
- **Testing + deployment**
  - Unit + integration tests.
  - Monitoring/observability.

Overall effort is currently estimated in the range of multiple weeks of work (roughly 5–7 weeks).

## Core Identifiers
### `userId` / `recipientId`
- The messaging layer is **pairwise** (1:1) between a sender (`userId`) and recipient (`recipientId`).

### `channelId`
Both web and mobile derive a stable conversation key:
- `channelId = [userId, recipientId].sort().join("_")`

This `channelId` is sent with outbound WebSocket messages.

## Endpoints (as used in current frontend code)
Note: These are currently **hardcoded in the clients**.

### Realtime WebSocket
- **Connect**
  - `wss://opehkmyi44.execute-api.eu-north-1.amazonaws.com/production/?userId=<userId>`

### Message history
- **Read message history**
  - `POST https://8pwu9lnge0.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-MessagesHistory`
  - Body:
    - `userId`
    - `recipientId`

### Latest message per contact (used for contact list previews)
- **Read latest/new messages**
  - `POST https://tgkskhfz79.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-NewMessages`
  - Body:
    - `userId`
    - `recipientId`

### Contacts
Contacts are fetched differently for host vs guest.
- **Host contacts**
  - `POST https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts`
  - Body:
    - `hostID`
- **Guest contacts**
  - `POST https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/FetchContacts_Guest`
  - Body:
    - `userID`

### User profile details (used to decorate contacts)
- **GetUserInfo**
  - `POST https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo`
  - Body:
    - `UserId`

### Booking context data (web)
Used to decorate the contact list with booking/property context.
- **Guest booking details**
  - `GET https://912b02rvk4.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-GuestBookingDetails?hostId=<hostId>&guestId=<guestId>`
- **Accommodation data**
  - Base: `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property`
  - Example:
    - `GET /hostDashboard/single?property=<propertyId>` (host)
    - `GET /bookingEngine/listingDetails?property=<propertyId>` (guest)

## Payload Shapes
### Outbound WebSocket payload (send message)
The web and mobile clients send a JSON payload via `socket.send(JSON.stringify(message))`.

Fields observed in code:
- `action: "sendMessage"`
- `accessToken: <jwt>`
- `recipientId: <user-id>`
- `text: <string>`
- `fileUrls: <string[]>` (optional, can be empty)
- `channelId: <userId_recipientId>`

### Inbound message payload
Inbound messages are appended to the client state and typically include:
- `id`
- `userId`
- `recipientId`
- `text`
- `createdAt`
- `fileUrls` (optional)
- `isAutomated` (optional)
- `messageType` (optional)

## Client Implementation (Web)
### Entry points
- UI
  - `frontend/web/src/components/messages/ContactList.jsx`
  - `frontend/web/src/components/messages/ChatScreen.jsx`
  - Container pages:
    - `frontend/web/src/features/messages/HostMessages.jsx`
    - `frontend/web/src/features/messages/GuestMessages.jsx`
    - `frontend/web/src/components/messages/Messages.js` (reusable wrapper)
- Realtime
  - `frontend/web/src/features/hostdashboard/hostmessages/context/webSocketContext.js`
  - `frontend/web/src/features/hostdashboard/hostmessages/services/websocket.js`
- Data
  - `frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchContacts.js`
  - `frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchMessages.js`
  - `frontend/web/src/features/hostdashboard/hostmessages/hooks/useSendMessage.js`

### Web flow summary
- **Connect**
  - `HostMessages`/`GuestMessages` wraps content in `WebSocketProvider userId={userId}`.
- **List contacts**
  - `useFetchContacts(userId, role)` calls FetchContacts endpoints, enriches contacts using GetUserInfo and latest message via Read-NewMessages.
- **Open conversation**
  - `ChatScreen` calls `fetchMessages(contactId)` to load history from Read-MessagesHistory.
- **Send message**
  - `useSendMessage(userId)` builds the outbound payload, derives `channelId`, and sends via WebSocket.
  - `ChatScreen` also adds an optimistic message locally.
- **Receive message**
  - `WebSocketContext` appends inbound messages into `messages`.
  - `ChatScreen` merges socket messages into conversation history.
  - `ContactList` uses socket messages to update `latestMessage` preview per contact.

### Demo/test behavior (web)
- `ChatScreen` treats `test-` / `demo-` IDs as demo conversations and skips remote history fetch (`skipRemote`).
- `ContactList` can create a local test contact; those conversations do not require backend access.

## Client Implementation (Mobile)
### Entry points
- Realtime
  - `frontend/app/Domits/src/screens/message/services/websocket.js`
  - `frontend/app/Domits/src/screens/message/context/webSocketContext.jsx`
- Data
  - `frontend/app/Domits/src/screens/message/Hooks/useFetchContacts.js`
  - `frontend/app/Domits/src/screens/message/Hooks/useFetchMessages.js`
  - `frontend/app/Domits/src/screens/message/Hooks/useSendMessage.js`
- Navigation wiring
  - `frontend/app/Domits/src/navigation/messagesStackNavigator.js` wraps the stack in `WebSocketProvider`.

### Mobile flow summary
- `WebSocketProvider` connects with `userId` and pushes inbound messages into local state.
- `useSendMessage` publishes outbound payloads with `action: "sendMessage"`, `accessToken`, `recipientId`, `channelId`.
- `useFetchMessages` fetches message history from Read-MessagesHistory.
- `useFetchContacts` fetches accepted/pending contacts, enriches them with GetUserInfo + latest message.

## Known Gaps / Notes
- **Backend code location**
  - The deployed Lambda names are referenced in docs, but the Lambda handler source for those endpoints does not appear to be present under `backend/` in this repository. The frontend currently targets deployed API Gateway endpoints directly.
- **Configuration**
  - URLs are hardcoded in frontend hooks/services.

## Related docs
- `messaging_overview.md`
- `messaging_frontend.md`
- `messaging_backend.md`
- `messaging_runbook.md`
- `messaging_testing.md`
