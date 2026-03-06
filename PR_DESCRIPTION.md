## Close or Relate the Issue
[//]: # (Only if this should close the issue)
- Closes #

[//]: # (in the issue a reference will be added to this pr)
- Related Issue: # (Add issue number here if available)

## Proposed Changes
[//]: # (Add a detailed description of the changes here)
Description:
Fixed messaging bug where conversations were not being saved and chat history was lost. Users could not select specific contacts to chat with, messages were not properly delivered, and conversations were not persisted.

**Key Changes:**
- **Message Persistence**: Messages now properly saved via UnifiedMessaging API with correct threadId linking
- **Contact List Updates**: Contact list now displays latest message preview instead of "No message history yet"
- **Thread Management**: Added proper threadId tracking and automatic updates when threads are created
- **Contact Matching**: Improved contact matching logic to handle both sent and received messages correctly
- **Backend Routing**: Fixed API Gateway path routing to properly handle different path formats
- **Message Fetching**: Updated message fetching to use actual threadId from backend instead of string concatenation
- **Error Handling**: Improved WebSocket error handling and message validation

**Files Changed (8 files):**
- `backend/functions/UnifiedMessaging/index.js` - Fixed API Gateway path routing to handle /default/messages, /default/threads, /default/send
- `frontend/web/src/components/messages/ChatScreen.jsx` - Added threadId support and proper message sending with UnifiedMessaging API
- `frontend/web/src/components/messages/ContactList.jsx` - Fixed latest message preview display and improved contact matching
- `frontend/web/src/components/messages/Messages.js` - Fixed message state handling (changed from array to null)
- `frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchContacts.js` - Fixed latest message fetching to use actual threadId
- `frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchMessages.js` - Fixed message fetching to use threadId and find threads by userId/recipientId
- `frontend/web/src/features/hostdashboard/hostmessages/hooks/useSendMessage.js` - Updated to use UnifiedMessaging API with proper threadId and propertyId
- `frontend/web/src/features/hostdashboard/hostmessages/services/websocket.js` - Improved error handling for WebSocket connections

## Change Type
- [x] Bug fix
- [ ] New feature
- [ ] Optimization
- [ ] Documentation update

## Change Size
[//]: # (Indicate the size of this change.)
[//]: # (Clarify under Refactoring which parts are moved/unchanged code, so the reviewer doesn't review old logic.)
- [ ] Huge change (1000+ lines, mostly refactored/moved code. Clarify in [Refactoring](#Refactoring))
- [ ] Big change (+-max 1000)
- [x] Small change (less than 300)

## Refactoring
Refactors following files, but didn't change the code. This is to avoid reviewing old logic.
- N/A (No refactoring, only bug fixes)

## Npm Packages
- [ ] NPM Packages installed
- [ ] NPM Packages removed
- [ ] NPM Packages updated
- [x] Checked for vulnerabilities using "npm audit"

## Checklist
[//]: # (All boxes must be checked before merging.)
- [ ] Pull request has at least 2 reviewers assigned
- [x] PR title is descriptive and includes issue number
- [x] Conventions
  - [x] No config files have been added (Amplify config, cache files)
  - [x] No hardcoded sensitive data (e.g., API-keys/passwords)
  - [x] No global styling (see [#1691](https://github.com/domits1/Domits/issues/1691))
  - [x] No `console.log` left in code (only console.warn for debugging where necessary)
  - [x] No commented-out code remains
- [x] Testing
  - [x] Code tested locally
  - [ ] Jest tests are included
  - [ ] Jest tests are passing

## Keep or delete my branch
- [x] Delete my branch after merge
- [ ] Keep my branch
