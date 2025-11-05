## Messaging Testing & Demos

### Node demos
- UI narrative demo:
  - Run: `node demo-automated-messages.js`
  - Shows the exact automated messages and timing that would appear in UI.
- Immediate automation runner:
  - Run: `node run-immediate-messaging-test.js`
  - Verifies that booking-related automated messages are sent immediately.

### Backend integration tests
- Files: `backend/test/messaging-integration.test.js`, `backend/test/immediate-messaging.test.js`
- What they cover:
  - Conversation initiation via Create-WebSocketMessage
  - Manual and automated messages payloads
  - Basic response structure

### Manual QA checklist
- Open two sessions (sender/recipient) with active WebSocket connections.
- Send a text message; verify realtime delivery on the other session.
- Upload an attachment; verify `fileUrls` rendered as attachments.
- Trigger booking event and confirm automated messages with `isAutomated: true` and correct `messageType`.
- Refresh page and verify history retrieved from Read-MessagesHistory.

### Useful scripts
- `demo-automated-messages.js`: prints a timed sequence of messages for booking scenarios.
- `run-immediate-messaging-test.js`: sends immediate automated messages to endpoints to validate pipeline.

