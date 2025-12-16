## Close or Relate the Issue
[//]: # (Only if this should close the issue)
- Closes #

[//]: # (in the issue a reference will be added to this pr)
- Related Issue: #

## Proposed Changes
[//]: # (Add a detailed description of the changes here)
Description:

## Change Type
- [ ] Bug fix
- [ ] New feature
- [ ] Optimization
- [ ] Documentation update

## Change Size
[//]: # (Indicate the size of this change.)
[//]: # (Clarify under Refactoring which parts are moved/unchanged code, so the reviewer doesn’t review old logic.)
- [ ] Huge change (1000+ lines, mostly refactored/moved code. Clarify in [Refactoring](#Refactoring))
- [ ] Big change (+-max 1000)
- [ ] Small change (less than 300)

## Refactoring
Refactors following files, but didn't change the code. This is to avoid reviewing old logic.
- src/features/example.xx
-

## Npm Packages
- [ ] NPM Packages installed
- [ ] NPM Packages removed
- [ ] NPM Packages updated
- [ ] Checked for vulnerabilities using "npm audit"

## Checklist
[//]: # (All boxes must be checked before merging.)
- [ ] Pull request has at least 2 reviewers assigned
- [ ] PR title is descriptive and includes issue number
- [ ] Conventions
  - [ ] No config files have been added (Amplify config, cache files)
  - [ ] No hardcoded sensitive data (e.g., API-keys/passwords)
  - [ ] No global styling (see [#1691](https://github.com/domits1/Domits/issues/1691))
  - [ ] No `console.log` left in code
  - [ ] No commented-out code remains
- [ ] Testing
  - [ ] Code tested locally
  - [ ] Jest tests are included
  - [ ] Jest tests are passing

## Keep or delete my branch
- [x] Delete my branch after merge
- [ ] Keep my branch  
