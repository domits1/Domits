---
type: source
status: active
area: developer-onboarding
owner: engineering
created: 2026-05-31
updated: 2026-06-03
confidence: medium
source:
  - local: Allow acces Amplify - localhost dev onboarding.docx
  - repo: docs/internal/onboarding/running Domits locally - SSO.md
related:
  - [[Domits_Developer_Onboarding]]
  - [[Domits_Web_Local_Setup]]
---
# Amplify Localhost Dev SSO Onboarding Source

- Last synced: 2026-06-03
- Scope: visual appendix for the historical web SSO onboarding handoff.

## How To Use This Note

- [[Domits_Web_Local_Setup]] is the authoritative vault runbook.
- Use this note when you want visual confirmation that the browser and CLI prompts look normal.
- Some screenshots show example profile names such as `domits-test`; replace those with the current team-provided profile.

## Screenshot Map

### 1. SSO Profile Bootstrap Example

Historical example of `aws configure sso --profile domits-test`.

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image1.png]]

### 2. AWS Browser Consent

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image2.png]]

### 3. AWS Browser Success Screen

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image3.png]]

### 4. Amplify Pull Using AWS Profile

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image4.png]]

### 5. Node.js Installer Example

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image5.png]]

### 6. Amplify CLI Install Verification

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image6.png]]

### 7. AWS Profile Selection Prompt

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image7.png]]

### 8. Example Profile List

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image8.png]]

### 9. Historical Credential-Read Failure And Retry

This capture shows a historical fallback flow using `aws sts get-caller-identity`, `set AWS_SDK_LOAD_CONFIG=1`, and a retry of `amplify pull`.

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image9.png]]

### 10. Amplify Studio Login Page

![[99_Attachments/Onboarding/Amplify_Localhost_Dev_SSO/image10.png]]
