

## 1. Basic Messaging

- [x] **Test Scenario: Send and receive text messages (Host)**
  - **Feature**: Text message sending via `useSendMessage` hook
  - **Test steps**:
    1. Log in as host
    2. Navigate to messaging tab
    3. Select a contact from the contact list
    4. Type a text message in the textarea
    5. Click send button or press Enter
    6. Verify message appears in chat immediately
    7. Verify message persists after page reload
    8. Verify message appears in contact list as latest message preview

- [x] **Test Scenario: Send and receive text messages (Guest)**
  - **Feature**: Text message sending for guest users
  - **Test steps**:
    1. Log in as guest
    2. Navigate to messaging tab
    3. Select a contact (host)
    4. Type and send a message
    5. Verify message appears in chat
    6. Verify host receives the message

- [x] **Test Scenario: Bidirectional message exchange**
  - **Feature**: Messages between host and guest
  - **Test steps**:
    1. Host sends a message to guest
    2. Guest logs in and sees the message
    3. Guest replies to the message
    4. Host sees the reply in real-time
    5. Verify both users see the complete conversation history

## 2. Message Validation and Limits

- [x] **Test Scenario: Character limit enforcement (200 characters)**
  - **Feature**: Character limit validation in `ChatScreen.jsx` (line 265, 274)
  - **Test steps**:
    1. Open a chat
    2. Type exactly 200 characters
    3. Verify character counter shows "200/200"
    4. Verify send button is enabled
    5. Type one more character (201 total)
    6. Verify send button becomes disabled
    7. Verify character counter shows "201/200" with error styling
    8. Verify Enter key does not send message when over limit

- [x] **Test Scenario: Prevent sending empty messages**
  - **Feature**: Empty message validation (line 149 in ChatScreen.jsx)
  - **Test steps**:
    1. Open a chat
    2. Try to send message with only whitespace
    3. Verify message is not sent
    4. Try to send completely empty message
    5. Verify send button is disabled or message is not sent

- [ ] **Test Scenario: Send message with only file attachments (no text)**
  - **Feature**: Messages can be sent with only file attachments
  - **Test steps**:
    1. Open a chat
    2. Upload a file attachment without typing any text
    3. Verify send button is enabled
    4. Send the message
    5. Verify message with only attachment is sent successfully

## 3. File Attachments

- [ ] **Test Scenario: Upload file via file picker**
  - **Feature**: File upload via `ChatUploadAttachment` component
  - **Test steps**:
    1. Open a chat
    2. Click the "+" button for attachments
    3. Select an image file from file picker
    4. Verify file uploads successfully
    5. Verify preview thumbnail appears in attachment area
    6. Send the message
    7. Verify attachment appears in the chat
    8. Verify attachment is clickable and opens in modal

- [ ] **Test Scenario: Drag and drop file upload**
  - **Feature**: Drag & drop functionality (lines 12-25 in chatUploadAttachment.js)
  - **Test steps**:
    1. Open a chat
    2. Drag a file over the "+" button
    3. Drop the file
    4. Verify file uploads automatically
    5. Verify preview appears
    6. Send message and verify attachment works

- [ ] **Test Scenario: Upload multiple files**
  - **Feature**: Multiple file support (line 85 in chatUploadAttachment.js)
  - **Test steps**:
    1. Open a chat
    2. Click "+" and select multiple files
    3. Verify all files upload
    4. Verify first file shows as preview thumbnail
    5. Verify "+X" badge shows count of additional files
    6. Click preview to open popover
    7. Verify all files are shown in preview grid
    8. Send message and verify all attachments appear

- [ ] **Test Scenario: Remove attachment before sending**
  - **Feature**: Remove attachment from preview popover (lines 301-307 in ChatScreen.jsx)
  - **Test steps**:
    1. Upload multiple files
    2. Open preview popover
    3. Click remove button (X) on one attachment
    4. Verify attachment is removed from preview
    5. Verify remaining attachments still show
    6. Send message and verify only remaining attachments are sent

- [ ] **Test Scenario: Display different file types (images and videos)**
  - **Feature**: Image and video rendering (lines 69-79 in ChatMessage.js)
  - **Test steps**:
    1. Send a message with an image attachment
    2. Verify image displays correctly in chat
    3. Click image to open in modal
    4. Send a message with a video attachment (.mp4)
    5. Verify video displays with controls
    6. Verify video can be played

## 4. Real-time Messaging (WebSocket)

- [ ] **Test Scenario: Real-time message reception**
  - **Feature**: WebSocket real-time updates (lines 122-146 in ChatScreen.jsx)
  - **Test steps**:
    1. Open a chat as host
    2. Have another user (guest) send a message
    3. Verify message appears immediately without page refresh
    4. Verify toast notification appears with contact name, image, and message preview
    5. Verify message is added to chat history

- [ ] **Test Scenario: WebSocket connection and ping/pong**
  - **Feature**: WebSocket connection with keepalive (lines 18-24 in websocket.js)
  - **Test steps**:
    1. Open messaging tab
    2. Verify WebSocket connects (check network tab for WSS connection)
    3. Wait 5 minutes
    4. Verify ping messages are sent every 5 minutes
    5. Verify connection stays alive

- [ ] **Test Scenario: WebSocket reconnection handling**
  - **Feature**: WebSocket error handling
  - **Test steps**:
    1. Open a chat
    2. Simulate network disconnection
    3. Verify error is logged
    4. Restore network connection
    5. Verify new messages are received again

## 5. Message History and Caching

- [x] **Test Scenario: Load message history**
  - **Feature**: Message history fetching via `useFetchMessages` (lines 12-75)
  - **Test steps**:
    1. Open a chat with existing messages
    2. Verify messages load from API
    3. Verify messages are sorted chronologically
    4. Verify all previous messages are displayed
    5. Verify loading state shows during fetch

- [ ] **Test Scenario: Message history caching**
  - **Feature**: Message caching per conversation (lines 22-27, 61 in useFetchMessages.js)
  - **Test steps**:
    1. Open chat A (first time - loads from server)
    2. Switch to chat B
    3. Switch back to chat A
    4. Verify messages appear immediately (no loading state)
    5. Verify messages are from cache, not refetched

- [ ] **Test Scenario: Message history timeout handling**
  - **Feature**: 10-second timeout for message fetching (line 32 in useFetchMessages.js)
  - **Test steps**:
    1. Simulate slow network connection
    2. Open a chat
    3. Verify loading state appears
    4. If request takes > 10 seconds, verify timeout triggers
    5. Verify error state is handled gracefully

## 6. Search Functionality

- [ ] **Test Scenario: Search messages within a chat**
  - **Feature**: Message search in chat header (lines 184-191, 204-210 in ChatScreen.jsx)
  - **Test steps**:
    1. Open a chat with multiple messages
    2. Use search input in chat header
    3. Type a keyword that exists in a message
    4. Verify only matching messages are displayed
    5. Verify search works for both text and file URLs
    6. Clear search input
    7. Verify all messages are shown again

- [ ] **Test Scenario: Search contacts in contact list**
  - **Feature**: Contact search (lines 157-161, 202-228 in ContactList.jsx)
  - **Test steps**:
    1. Navigate to messaging tab
    2. Use search input at top of contact list
    3. Type a contact name
    4. Verify only matching contacts are shown
    5. Clear search
    6. Verify all contacts are shown again

## 7. Contact Management

- [ ] **Test Scenario: Display contact list**
  - **Feature**: Contact list with accepted and pending contacts (useFetchContacts.js)
  - **Test steps**:
    1. Log in as host
    2. Navigate to messaging tab
    3. Verify contact list displays all accepted contacts
    4. Verify each contact shows:
       - Profile image
       - Name
       - Latest message preview
       - Booking status (if applicable)
       - Accommodation image (if available)

- [ ] **Test Scenario: Toggle between contacts and pending requests**
  - **Feature**: Contact list toggle (lines 231-239 in ContactList.jsx)
  - **Test steps**:
    1. Navigate to messaging tab
    2. Verify default shows "Contacts"
    3. Select "Sent requests" from dropdown
    4. Verify pending contacts are displayed
    5. Verify pending contacts show Accept/Deny buttons
    6. Switch back to "Contacts"
    7. Verify accepted contacts are shown

- [ ] **Test Scenario: Accept pending contact request**
  - **Feature**: Accept contact request (lines 11-17 in ContactItem.jsx)
  - **Test steps**:
    1. Navigate to messaging tab
    2. Switch to "Sent requests"
    3. Click "Accept" button on a pending contact
    4. Verify contact moves from pending to accepted list
    5. Verify contact can now be clicked to open chat

- [ ] **Test Scenario: Reject pending contact request**
  - **Feature**: Reject contact request (lines 19-25 in ContactItem.jsx)
  - **Test steps**:
    1. Navigate to messaging tab
    2. Switch to "Sent requests"
    3. Click "Deny" button on a pending contact
    4. Verify contact is removed from pending list
    5. Verify contact does not appear in accepted list

- [ ] **Test Scenario: Sort contacts alphabetically or by latest message**
  - **Feature**: Contact sorting (lines 163-171 in ContactList.jsx)
  - **Test steps**:
    1. Navigate to messaging tab
    2. Verify default sort is by latest message (most recent first)
    3. Click the bars icon (sort button)
    4. Verify contacts are sorted alphabetically
    5. Click again
    6. Verify contacts are sorted by latest message again

- [ ] **Test Scenario: Create test contact**
  - **Feature**: Create test contact functionality (lines 38-102 in ContactList.jsx)
  - **Test steps**:
    1. Navigate to messaging tab
    2. Click the "+" button
    3. Enter a contact name
    4. Optionally upload a profile image
    5. Click "Add"
    6. Verify new test contact appears in contact list
    7. Verify test contact can be clicked to open chat

- [ ] **Test Scenario: Close chat via context menu**
  - **Feature**: Context menu to close chat (lines 180-196, 290-300 in ContactList.jsx)
  - **Test steps**:
    1. Open a chat
    2. Right-click on the contact in contact list
    3. Verify context menu appears
    4. Click "Close chat"
    5. Verify chat is closed
    6. Verify contact list is shown

## 8. Automated Messages

- [ ] **Test Scenario: Open automated messages settings**
  - **Feature**: Automated settings modal (AutomatedSettings.js)
  - **Test steps**:
    1. Log in as host
    2. Navigate to messaging tab
    3. Click the settings (gear) icon
    4. Verify automated settings modal opens
    5. Verify tabs are visible: "Events & Triggers", "Customization", "Scheduling", "Preview"

- [ ] **Test Scenario: Enable/disable automated message events**
  - **Feature**: Toggle automated events (lines 30-45 in AutomatedSettings.js)
  - **Test steps**:
    1. Open automated messages settings
    2. Go to "Events & Triggers" tab
    3. Toggle a checkbox for an event (e.g., "Booking confirmation")
    4. Verify badge changes from "Paused" to "Active" (or vice versa)
    5. Verify unsaved changes indicator appears
    6. Save settings
    7. Verify changes are persisted

- [ ] **Test Scenario: Edit automated message templates**
  - **Feature**: Template customization (lines 47-59 in AutomatedSettings.js)
  - **Test steps**:
    1. Open automated messages settings
    2. Go to "Customization" tab
    3. Select an event (e.g., "Booking confirmation")
    4. Edit the template text
    5. Verify changes are tracked as unsaved
    6. Save settings
    7. Verify template is saved

- [ ] **Test Scenario: Configure automated message scheduling/delays**
  - **Feature**: Scheduling configuration (lines 61-73 in AutomatedSettings.js)
  - **Test steps**:
    1. Open automated messages settings
    2. Go to "Scheduling" tab
    3. Change delay for an event (e.g., check-in instructions)
    4. Verify delay is updated
    5. Save settings
    6. Verify delay is persisted

- [ ] **Test Scenario: Preview automated messages**
  - **Feature**: Message preview (lines 171-177 in AutomatedSettings.js)
  - **Test steps**:
    1. Open automated messages settings
    2. Go to "Preview" tab
    3. Select an event
    4. Verify preview shows the message as it will appear
    5. Verify placeholders are shown or replaced with sample data

- [ ] **Test Scenario: Reset automated messages to defaults**
  - **Feature**: Reset functionality (lines 75-81 in AutomatedSettings.js)
  - **Test steps**:
    1. Open automated messages settings
    2. Make some changes to templates
    3. Click "Reset" button
    4. Verify confirmation dialog appears
    5. Confirm reset
    6. Verify all settings return to defaults
    7. Verify unsaved changes indicator appears

- [ ] **Test Scenario: Save automated message settings**
  - **Feature**: Save settings to localStorage (lines 83-91 in AutomatedSettings.js)
  - **Test steps**:
    1. Open automated messages settings
    2. Make changes
    3. Click "Save" button
    4. Verify button shows "Saving..." then "Saved"
    5. Close and reopen settings
    6. Verify changes are persisted

- [ ] **Test Scenario: Test messages button**
  - **Feature**: Test automated messages (lines 64-120 in ChatScreen.jsx)
  - **Test steps**:
    1. Open a chat
    2. Click "Test messages" button in chat header
    3. Verify 3 automated test messages are sent:
       - Welcome message
       - Check-in instructions
       - Wi-Fi info
    4. Verify toast notifications appear for each message
    5. Verify messages appear in chat with automated styling
    6. Verify contact list preview updates with last message

## 9. UI/UX Features

- [ ] **Test Scenario: Auto-scroll to latest message**
  - **Feature**: Auto-scroll on new messages (lines 55-60 in ChatScreen.jsx)
  - **Test steps**:
    1. Open a chat with many messages
    2. Verify chat scrolls to bottom automatically
    3. Send a new message
    4. Verify chat scrolls to show new message
    5. Verify scroll happens smoothly

- [ ] **Test Scenario: Loading states**
  - **Feature**: Loading indicators (lines 223-224, 46-53 in ChatScreen.jsx)
  - **Test steps**:
    1. Open a chat for the first time
    2. Verify "Loading messages..." appears
    3. Verify loading state clears when messages load
    4. Verify timeout after 12 seconds if loading persists

- [ ] **Test Scenario: Error handling and display**
  - **Feature**: Error states (lines 225-226, 154-156, 315 in ChatScreen.jsx)
  - **Test steps**:
    1. Simulate network error
    2. Try to send a message
    3. Verify error message is displayed
    4. Try to load messages with invalid contact ID
    5. Verify error is handled gracefully

- [ ] **Test Scenario: Responsive design (mobile)**
  - **Feature**: Mobile responsive layout (hostMessages.scss)
  - **Test steps**:
    1. Open messaging on mobile or narrow viewport (< 768px)
    2. Verify contact list and chat stack vertically
    3. Verify "Back to contacts" button appears
    4. Click back button
    5. Verify contact list is shown
    6. Verify navigation works correctly

- [ ] **Test Scenario: Character counter display**
  - **Feature**: Character limit indicator (lines 279-286 in ChatScreen.jsx)
  - **Test steps**:
    1. Open a chat
    2. Start typing a message
    3. Verify character counter appears showing "X/200"
    4. Type more than 200 characters
    5. Verify counter shows error styling (over limit)
    6. Delete characters to get under limit
    7. Verify counter returns to normal styling

- [ ] **Test Scenario: Enter key to send message**
  - **Feature**: Enter key submission (lines 263-269 in ChatScreen.jsx)
  - **Test steps**:
    1. Open a chat
    2. Type a message
    3. Press Enter key
    4. Verify message is sent (if under 200 chars)
    5. Type message over 200 chars
    6. Press Enter
    7. Verify message is NOT sent

## 10. Booking Details Integration

- [ ] **Test Scenario: Display booking details in chat**
  - **Feature**: Booking details fetching (useFetchBookingDetails.js)
  - **Test steps**:
    1. Open a chat with a guest who has a booking
    2. Verify booking information is fetched
    3. Verify booking details are displayed (if UI shows them)
    4. Verify property information is available

- [ ] **Test Scenario: Display booking status in contact list**
  - **Feature**: Booking status in contacts (lines 9, 41-43 in ContactItem.jsx)
  - **Test steps**:
    1. Navigate to messaging tab
    2. Verify contacts with bookings show status:
       - "Reservation approved" for Accepted
       - "Inquiry sent" for Pending
       - "Reservation unsuccessful" for Failed
    3. Verify accommodation image is shown when available

## 11. Toast Notifications

- [ ] **Test Scenario: Toast notification for new messages**
  - **Feature**: Toast notifications (lines 102-110, 136-144 in ChatScreen.jsx)
  - **Test steps**:
    1. Open a chat (or leave messaging tab open)
    2. Have another user send a message
    3. Verify toast notification appears
    4. Verify toast shows:
       - Contact name
       - Contact profile image
       - Message preview (truncated to 80 chars)
    5. Verify toast appears even when chat is active

## 12. Message Display

- [ ] **Test Scenario: Display message timestamps**
  - **Feature**: Timestamp formatting (lines 16-19 in ChatMessage.js)
  - **Test steps**:
    1. Open a chat with messages
    2. Verify each message shows timestamp in HH:MM format
    3. Verify timestamps are accurate
    4. Verify timestamps are formatted correctly

- [ ] **Test Scenario: Display automated message indicators**
  - **Feature**: Automated message styling (lines 31-43, 48-59 in ChatMessage.js)
  - **Test steps**:
    1. Receive or send an automated message
    2. Verify automated message has special styling
    3. Verify automated icon is displayed (party popper, clipboard, door, wifi, etc.)
    4. Verify "(Automated)" label appears
    5. Verify message type determines the icon

- [ ] **Test Scenario: Display sent vs received messages**
  - **Feature**: Message direction styling (lines 24-26 in ChatMessage.js)
  - **Test steps**:
    1. Open a chat
    2. Send a message
    3. Verify sent message appears on right side (or appropriate styling)
    4. Receive a message
    5. Verify received message appears on left side (or appropriate styling)
    6. Verify visual distinction between sent and received

- [ ] **Test Scenario: Display read/unread status**
  - **Feature**: Read status indicator (line 49 in ChatMessage.js)
  - **Test steps**:
    1. Send a message
    2. Verify message shows as unread initially
    3. Have recipient read the message
    4. Verify message status updates to read
    5. Verify visual indicator changes

## 13. Attachment Preview

- [ ] **Test Scenario: Preview popover for multiple attachments**
  - **Feature**: Attachment preview popover (lines 289-312 in ChatScreen.jsx)
  - **Test steps**:
    1. Upload multiple file attachments
    2. Click on the preview thumbnail
    3. Verify popover opens showing all attachments
    4. Verify each attachment is displayed in grid
    5. Verify remove button (X) is available for each
    6. Click close button
    7. Verify popover closes

- [ ] **Test Scenario: Image modal for viewing attachments**
  - **Feature**: Image modal (lines 83-90 in ChatMessage.js)
  - **Test steps**:
    1. Send or receive a message with image attachment
    2. Click on the image in chat
    3. Verify modal opens with enlarged image
    4. Click outside modal or on image
    5. Verify modal closes

---

## Notes

- [x] = Already tested / Can be tested now
- [ ] = New testable scenarios based on implemented features
