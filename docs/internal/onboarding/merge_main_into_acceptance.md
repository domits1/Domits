## 1. Releasing Acceptance to Production (`main`)

This section explains how changes that are already merged into `acceptance` are promoted to the **live production environment** via the `main` branch.

> [!IMPORTANT]  
> This is **not a regular feature Pull Request**.  
> This is a **release merge** from `acceptance` into `main`.

---

### 1.1 Create the Release Pull Request

1. Go to the [Domits GitHub repository](https://github.com/domits1/Domits)
2. Open the [Pull requests tab](https://github.com/domits1/Domits/pulls)
3. Click [New pull request](https://github.com/domits1/Domits/compare)
4. Configure the branches:
   - **Base branch:** `main`
   - **Compare branch:** `acceptance`

Double-check this configuration.  
Reversing these branches can cause serious production issues.

5. Click **Create pull request**

---

### 1.2 PR Title and Purpose

Use a clear and explicit title:

```
chore(release): merge acceptance into main
```

Why this matters:
- It clearly signals a production release
- No new code is introduced
- Only previously reviewed and tested code is deployed

The PR template will be shown.  
Fill it in **briefly but correctly**. Feature-level explanations are not required here.

---

### 1.3 Temporarily Adjust Branch Protection (Release Only)

Because all changes in `acceptance` have already:
- passed code review
- passed CI checks
- been validated in the acceptance environment

the merge into `main` can be performed **without additional approvals**.

Steps:

1. Go to **Settings → Branches**
2. Locate the branch rule for `main`
3. Click **Edit**
4. Temporarily disable:
   - **Require approvals**
5. Click **Save changes**

> [!WARNING]  
> This exception is **only** allowed for this release merge.  
> Failing to restore protections afterwards introduces structural risk.

---

### 1.4 Merge and Deploy

1. Return to the release Pull Request
2. Merge the PR into `main`
3. After merging, the **production deployment starts automatically**

---

### 1.5 Verify Production Deployment

After the merge, verification is the developer’s responsibility.

Check:
- **AWS Amplify** to confirm the deployment completed successfully
- The live environment (for example):
  https://www.domits.com/

At minimum, verify:
- Pages load correctly
- Critical flows work as expected (e.g. bookings, properties load correctly)

If anything fails:
- Notify the team immediately
- Do not assume the issue will resolve itself

---

### 1.6 Restore Branch Protection

After a successful deployment:

1. Go back to **Settings → Branches**
2. Edit the `main` branch rule
3. Re-enable:
   - **Require approvals**
4. Click **Save changes**

This step is mandatory.  
Production safety depends on it.
