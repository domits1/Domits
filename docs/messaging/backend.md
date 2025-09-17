## Backend Messaging

Domits messaging relies on AWS API Gateway (WebSocket + REST) and Lambda handlers in the bookings domain to create and dispatch messages. Automated messages reuse the same pipeline.

### Endpoints
- Create message (WebSocket entry): `POST https://tgkskhfz79.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Create-WebSocketMessage`
  - Payload: `{ action: "sendMessage", userId, recipientId, text, propertyId?, isAutomated?, messageType?, fileUrls? }`
  - Used by tests: `backend/test/messaging-integration.test.js`, `run-immediate-messaging-test.js`
- Read history: `POST https://8pwu9lnge0.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-MessagesHistory`
  - Payload: `{ userId, recipientId }`
  - Used by mobile `useFetchMessages.js`

### Automated Messages
- Location: `backend/functions/General-Bookings-CRUD-Bookings-develop/business/automatedMessageService.js`
- Triggers: booking lifecycle events (confirmation, check-in, Wi‑Fi info, check-out)
- Templates align with demos in `demo-automated-messages.js` and runners in `run-immediate-messaging-test.js`

### Flow
1) Client calls Create-WebSocketMessage with `action=sendMessage`.
2) Lambda validates, persists, and dispatches to the recipient via API Gateway WebSocket connection.
3) Recipient’s client receives JSON payload on open socket and appends to chat.
4) History can be queried via Read-MessagesHistory.

### Message Schema (server side)
Fields commonly observed in tests and clients:

```json
{
  "id": "uuid",
  "userId": "sender",
  "recipientId": "receiver",
  "text": "message",
  "createdAt": "ISO timestamp",
  "fileUrls": ["https://..."],
  "isAutomated": true,
  "messageType": "checkin_instructions|wifi_info|checkout_instructions|booking_confirmation"
}
```

### Related Code
- Tests: `backend/test/messaging-integration.test.js`, `backend/test/immediate-messaging.test.js`
- Booking services calling automation: `backend/functions/General-Bookings-CRUD-Bookings-develop/business/sendAutomatedMessage.js`

