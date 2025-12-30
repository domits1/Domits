**Is there an existing issue for this?**
- [x] No

**Describe the bug**
Automated welcome messages are successfully sent and stored in the database when a guest makes a booking, but these messages do not appear in the guest's message dashboard. The backend APIs return correct data, but the frontend fails to display the contacts/messages in the UI, showing "No contacts found" instead.

**Expected behavior**
When a guest makes a booking:
1. An automated welcome message should be sent from the host to the guest
2. The message should be stored in the `unified_message` table via UnifiedMessaging Lambda
3. The guest should see a new contact (the host) in their message dashboard
4. Clicking on the contact should show the automated welcome message on the left side (received from host)
5. The host should also see the guest as a contact with the sent message on the right side

**To Reproduce**
Steps to reproduce the behavior:
0. Clone repo, install dependencies, serve app locally
1. Checkout branch `pr/automated-messages-booking`
2. Log in as a guest (test user ID: `c9f83658-2df3-49ce-bd05-928271abb2ba`)
3. Make a test booking for any property
4. Navigate to Guest Dashboard → Messages
5. Observe: "No contacts found" is displayed
6. Open browser console and check logs
7. See that threads and contacts are fetched successfully but UI doesn't update

**Backend Verification (Working ✅)**
```bash
# Verify thread exists
curl "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/threads?userId=c9f83658-2df3-49ce-bd05-928271abb2ba"
# Returns: 1 thread object with hostId and guestId

# Verify messages exist  
curl "https://54s3llwby8.execute-api.eu-north-1.amazonaws.com/default/messages?userId=c9f83658-2df3-49ce-bd05-928271abb2ba&recipientId=0f5cc159-c8b2-48f3-bf75-114a10a1d6b3"
# Returns: 11 automated welcome messages with correct senderId and content
```

**Logs, Screenshots, Video**

**Console Logs (Frontend):**
```
✅ "=== FETCH CONTACTS CALLED ===" { userId: "c9f83658...", role: "guest" }
✅ "Fetching unified threads..."
✅ "Threads response: 200"
✅ "Threads data: [Object] (1)"
✅ "Unified contacts created: [Object] (1)"
✅ "Legacy contacts: undefined" (expected - legacy API fails, non-blocking)
✅ "All accepted contacts: [Object] (1)"
✅ "Unique accepted contacts: [Object] (1)"
✅ "About to fetch user info for: 1 contacts"
✅ "Accepted contacts with user info: [Object] (1)"
❌ "Setting contacts:" - May or may not appear
❌ "Contacts set successfully" - May or may not appear
⚠️  Multiple 403 errors from booking details API (non-blocking, wrapped in try-catch)
```

**Key Files Modified:**

Backend:
- `/backend/functions/UnifiedMessaging/data/threadRepository.js` (Lines 37-55) - Made `propertyId` optional in thread search
- `/backend/functions/UnifiedMessaging/business/messageService.js` (Lines 63-79) - Added getMessagesByUsers method

Frontend:
- `/frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchContacts.js` (Lines 16-250) - Made legacy API non-blocking, added unified threads support
- `/frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchMessages.js` (Lines 77-82) - Maps `content` to `text` field

**Desktop (please complete the following information):**
 - OS: macOS
 - Browser: Chrome/Safari (issue occurs in both)
 - Version: Latest

**Root Cause Analysis:**

**What Works:**
- ✅ Backend: Messages are sent and stored correctly
- ✅ Backend: UnifiedMessaging API returns correct data
- ✅ Frontend: Threads are fetched successfully (200 response)
- ✅ Frontend: Contacts are created from threads
- ✅ Frontend: User info is fetched for contacts
- ✅ Frontend: Legacy API failures don't block the process

**What's Broken:**
- ❌ Frontend: Contacts don't appear in the UI despite successful data processing
- ❌ Frontend: Either `setContacts()` isn't being called, or React state isn't updating, or component isn't re-rendering

**Suspected Issues:**
1. React state update not triggering re-render
2. Component unmounting before state updates complete
3. Contacts being filtered out by downstream logic in ContactList component
4. Silent error between user info fetch and setContacts call

**Additional context**

**Debugging Steps for Next Developer:**

1. **Check if setContacts is called**: Look for "Setting contacts:" and "Contacts set successfully" in console
2. **Verify ContactList receives data**: Add logging in ContactList component to check if contacts prop updates
3. **Check React DevTools**: Inspect ContactList component state and props
4. **Check for filtering**: Search ContactList.jsx for any `.filter()` calls that might remove the contact
5. **Try hardcoded contact**: Set a dummy contact to verify UI rendering works

**Code References:**

Thread search (working):
```javascript
// /backend/functions/UnifiedMessaging/data/threadRepository.js:37-55
async findThread(userId1, userId2, propertyId) {
  const queryBuilder = client
    .getRepository(UnifiedThread)
    .createQueryBuilder("thread")
    .where("(thread.hostId = :u1 AND thread.guestId = :u2) OR (thread.hostId = :u2 AND thread.guestId = :u1)", {
      u1: userId1,
      u2: userId2,
    });
  
  if (propertyId) {
    queryBuilder.andWhere("thread.propertyId = :pId", { pId: propertyId });
  }
  
  return await queryBuilder.getOne();
}
```

Contact processing (partial):
```javascript
// /frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchContacts.js:230-243
const acceptedContacts = await fetchUserInfoForContacts(JSONData.accepted, isHost ? "userId" : "hostId");
console.log("Accepted contacts with user info:", acceptedContacts);

console.log("Setting contacts:", acceptedContacts);
setContacts(acceptedContacts); // ← Suspected failure point
setPendingContacts(pendingContacts);
console.log("Contacts set successfully");
```

**Environment:**
- Branch: `pr/automated-messages-booking`
- API Gateway: `54s3llwby8.execute-api.eu-north-1.amazonaws.com`
- Region: `eu-north-1`
- Stripe Keys: TEST mode
- Database: Aurora DSQL with unified_thread and unified_message tables

**Note:** This is likely a React state/rendering issue rather than a data fetching issue. The backend is 100% functional and all data is being fetched correctly by the frontend up until the final state update step.
