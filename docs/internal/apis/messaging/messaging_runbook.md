## Messaging Runbook

Operational notes, troubleshooting, and FAQs for Domits messaging.

### Components
- API Gateway WebSocket: broadcasts messages to connected clients.
- REST endpoints: create message, read history.
- Lambdas: validation, persistence, dispatch, automation triggers.
- Clients: Web and Mobile apps maintaining socket connections.

### Operations
- Rotation: ensure WebSocket URL and REST base are up-to-date in clients.
- Health checks: verify Create-WebSocketMessage returns 2xx and a message appears in the recipient client.
- Versioning: coordinate template changes in automation with frontend indicators.

### Troubleshooting
- Messages not received in realtime:
  - Check client’s WebSocket is CONNECTING/OPEN; reconnect if CLOSED.
  - Confirm `sendMessage` payload conforms to schema (action, recipientId, text/fileUrls, channelId).
  - Inspect API Gateway logs for dispatch errors.
- History empty or partial:
  - Verify `Read-MessagesHistory` POST body includes correct `userId` and `recipientId`.
  - Check date sorting on client (`createdAt`) and server indexing.
- Attachments missing:
  - Ensure `fileUrls` is an array of accessible URLs.
  - Validate CORS and signed URL expirations.
- Automated messages not appearing:
  - Confirm booking triggers fired and automation service executed.
  - Verify `isAutomated: true` and `messageType` set.

### FAQs
- How do we identify a chat channel?
  - `channelId = [userId, recipientId].sort().join("_")` for pairwise chats.
- How do we test without backend?
  - Use `useLocalRoomMessages` (web) for local, cross-tab messaging.
- Where are endpoints set?
  - WebSocket wss in mobile service; REST endpoints in hooks/services and tests.

### References
- Overview: `docs/messaging/overview.md`
- Frontend: `docs/messaging/frontend.md`
- Backend: `docs/messaging/backend.md`
- Testing: `docs/messaging/testing.md`

