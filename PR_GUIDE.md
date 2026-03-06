# How to Raise a PR for Messaging Bug Fix (Fork Workflow)

## Step 0: Fork the Repository (If you haven't already)

✅ **You've already forked it!** Your fork: https://github.com/srinath2404/Domits

## Step 1: Clone Your Fork and Set Up Remote

```bash
# Clone your fork
git clone https://github.com/srinath2404/Domits.git
cd Domits

# Add the original repository as upstream (to keep your fork updated)
git remote add upstream https://github.com/domits1/Domits.git

# Verify remotes
git remote -v
# Should show:
# origin    https://github.com/srinath2404/Domits.git (your fork)
# upstream  https://github.com/domits1/Domits.git (original repo)
```

**Note:** If you already have the repo cloned, just add the upstream remote:
```bash
git remote add upstream https://github.com/domits1/Domits.git
```

## Step 2: Create a New Branch
```bash
git checkout -b fix/messaging-conversations-not-saved
```

## Step 3: Stage Only the Necessary Files

### Backend Files (1 file):
```bash
git add backend/functions/UnifiedMessaging/index.js
```

### Frontend Messaging Files (7 files):
```bash
git add frontend/web/src/components/messages/ChatScreen.jsx
git add frontend/web/src/components/messages/ContactList.jsx
git add frontend/web/src/components/messages/Messages.js
git add frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchContacts.js
git add frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchMessages.js
git add frontend/web/src/features/hostdashboard/hostmessages/hooks/useSendMessage.js
git add frontend/web/src/features/hostdashboard/hostmessages/services/websocket.js
```

### Optional: Other Related Fixes (if you want to include them):
```bash
# Apollo Client fix
git add frontend/web/src/App.js

# Login syntax error fix
git add frontend/web/src/features/auth/Login.js

# PropertyType error handling
git add frontend/web/src/pages/home/homePage.js
```

## Step 4: Verify Staged Files
```bash
git status
```

You should see only the files you want to include in the PR.

## Step 5: Commit the Changes
```bash
git commit -m "Fix: Messaging conversations not being saved and chat history lost

- Fixed message sending to use UnifiedMessaging API with proper threadId
- Fixed message fetching to use actual threadId from backend
- Fixed contact list to display latest message preview
- Improved contact matching logic for sent/received messages
- Fixed backend routing to handle API Gateway paths correctly
- Added proper threadId tracking and updates"
```

## Step 6: Push to Your Fork
```bash
git push origin fix/messaging-conversations-not-saved
```

## Step 7: Create Pull Request on GitHub

### Option 1: From Your Fork (Easiest)
1. Go to **your forked repository**: https://github.com/srinath2404/Domits
2. You should see a banner saying "fix/messaging-conversations-not-saved had recent pushes" with a **"Compare & pull request"** button - **Click it**
3. GitHub will automatically set:
   - Base repository: `domits1/Domits` (base: `acceptance`)
   - Head repository: `srinath2404/Domits` (compare: `fix/messaging-conversations-not-saved`)
4. Fill out the PR template below

### Option 2: From Original Repository
1. Go to the **original repository**: https://github.com/domits1/Domits
2. Click **"Pull Requests"** → **"New Pull Request"**
3. Click **"compare across forks"**
4. Set:
   - **Base repository**: `domits1/Domits` (base: `acceptance`)
   - **Head repository**: `srinath2404/Domits` (compare: `fix/messaging-conversations-not-saved`)
5. Fill out the PR template below
4. Fill out the PR template:

### PR Template Content:

```markdown
## Close or Relate the Issue
- Related Issue: #[issue-number]

## Proposed Changes
Description:
Fixed messaging bug where conversations were not being saved and chat history was lost. 

**Key Changes:**
- Messages now properly saved via UnifiedMessaging API with threadId
- Contact list displays latest message preview instead of "No message history yet"
- Improved contact matching to handle both sent and received messages
- Fixed backend routing to properly handle API Gateway paths
- Added threadId tracking and automatic updates when threads are created

## Change Type
- [x] Bug fix

## Change Size
- [ ] Small change (less than 300)

## Npm Packages
- [ ] NPM Packages installed
- [ ] NPM Packages removed
- [ ] NPM Packages updated
- [x] Checked for vulnerabilities using "npm audit"

## Checklist
- [ ] Pull request has at least 2 reviewers assigned
- [x] PR title is descriptive and includes issue number
- [x] Conventions
  - [x] No config files have been added (Amplify config, cache files)
  - [x] No hardcoded sensitive data (e.g., API-keys/passwords)
  - [x] No global styling
  - [x] No `console.log` left in code (only console.warn for debugging)
  - [x] No commented-out code remains
- [x] Testing
  - [x] Code tested locally
  - [ ] Jest tests are included
  - [ ] Jest tests are passing

## Keep or delete my branch
- [x] Delete my branch after merge
```

## Files Included in This PR:

### Backend (1 file):
- `backend/functions/UnifiedMessaging/index.js` - Fixed API Gateway path routing

### Frontend (7 files):
- `frontend/web/src/components/messages/ChatScreen.jsx` - Added threadId support
- `frontend/web/src/components/messages/ContactList.jsx` - Fixed latest message preview
- `frontend/web/src/components/messages/Messages.js` - Fixed message state handling
- `frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchContacts.js` - Fixed latest message fetching with threadId
- `frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchMessages.js` - Fixed message fetching with threadId
- `frontend/web/src/features/hostdashboard/hostmessages/hooks/useSendMessage.js` - Fixed message sending with UnifiedMessaging API
- `frontend/web/src/features/hostdashboard/hostmessages/services/websocket.js` - Improved error handling

## Quick Command Summary (Complete Workflow):

```bash
# 1. Fork the repo on GitHub first (already done: https://github.com/srinath2404/Domits)

# 2. Clone your fork
git clone https://github.com/srinath2404/Domits.git
cd Domits

# 3. Add upstream remote
git remote add upstream https://github.com/domits1/Domits.git

# 4. Create and switch to new branch
git checkout -b fix/messaging-conversations-not-saved

# 5. Stage only messaging-related files
git add backend/functions/UnifiedMessaging/index.js
git add frontend/web/src/components/messages/ChatScreen.jsx
git add frontend/web/src/components/messages/ContactList.jsx
git add frontend/web/src/components/messages/Messages.js
git add frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchContacts.js
git add frontend/web/src/features/hostdashboard/hostmessages/hooks/useFetchMessages.js
git add frontend/web/src/features/hostdashboard/hostmessages/hooks/useSendMessage.js
git add frontend/web/src/features/hostdashboard/hostmessages/services/websocket.js

# 6. Verify staged files
git status

# 7. Commit
git commit -m "Fix: Messaging conversations not being saved and chat history lost

- Fixed message sending to use UnifiedMessaging API with proper threadId
- Fixed message fetching to use actual threadId from backend  
- Fixed contact list to display latest message preview
- Improved contact matching logic for sent/received messages
- Fixed backend routing to handle API Gateway paths correctly"

# 8. Push to your fork
git push origin fix/messaging-conversations-not-saved

# 9. Go to GitHub and create PR from your fork to original repo
```

## Important Notes:

- **Fork first**: You must fork the repository on GitHub before cloning
- **Push to your fork**: Always push to `origin` (your fork), not `upstream` (original repo)
- **PR goes to original**: The PR should be created from your fork to the original repository
- **Keep fork updated**: Periodically sync your fork with upstream:
  ```bash
  git fetch upstream
  git checkout main
  git merge upstream/main
  git push origin main
  ```
