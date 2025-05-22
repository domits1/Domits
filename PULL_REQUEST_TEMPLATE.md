## Your name
Name: @_GitHub_username

## close or relate the issue
- Closes #_issue_number (only if it should close it)
- Related Issue: #_issue_number (in the issue a reference will be added to this pr)

## Proposed Changes
Description: [Please add detailed description of the changes here]

## Branch management
- [ ] Merging into acceptance (not main)

## Change size
_Please indicate the size of this change._  
  _Please clarify in the description which parts are moved/unchanged code, so the reviewer doesn’t review old logic._

- [ ] Huge change (1000+ lines, mostly refactored/moved code — explain in description to avoid reviewing old logic)
- [ ] Big change (+-max 1000)
- [ ] Small change (less than 300)

## Change type
- [ ] Bug fix
- [ ] New feature
- [ ] Optimalization
- [ ] Documentation update

## Refactoring
- [ ] Refactors following files (but didn't change the code)
  _- src/features/example.xx_
  _- app/src/data/example.xx_

## Npm packages 
- [ ] NPM Packages installed
- [ ] NPM Packages removed
- [ ] NPM Packages updated
- [ ] Did you check for vulnerabilities using "npm audit"?

## PR workflow
_0. Pull the latest version of *Acceptance* `$git pull origin/acceptance`_
_1. Create a “branch” (version)_
_2. Commit and push your changes_
_3. Test your code locally_
_4. Open a “Pull Request” (PR = propose changes)_
_5. Discuss and request review of your code_
_6. “Merge” your branch to the master branch_

## Checklist  
- [ ] No global styling (see [#1691](https://github.com/domits1/Domits/issues/1691) for why)  
- [ ] No `console.log` left in code  
- [ ] No commented-out code remains  
- [ ] Jest tests are included
- [ ] Jest tests are passing  
- [ ] Pull request has an assigned reviewer  
- [ ] PR title is descriptive and includes issue number  
- [ ] Code tested locally  
- [ ] No hardcoded sensitive data (e.g., API-keys/passwords)  

_All boxes must be checked before merging._  

## Reviewers  
As the Pull Requester, **you are responsible for your own pull request.**  
1. Send a message (with PR link) to the reviewer you choose.  
2. If they don’t respond within a reasonable time, **remind them or choose another.**  
3. You are also responsible for resolving feedback and notifying the reviewer after updates.  
(*Note: GitHub notifications are often muted – always follow up with a DM.*)  

### Select two reviewers

- [ ] Primary Reviewer: @_GitHub_username
- Marijn (Styling, SCSS, JS)  
- Sander (App, Backend)  

- [ ] Secondary Reviewer: @_GitHub_username
Preferably someone familiar with the part of code you're working on. For example:  
- Ryan  
- Kacper  
- Raman  

## Keep or delete my branch  
- [x] Delete my branch after merge  
- [ ] Keep my branch  
