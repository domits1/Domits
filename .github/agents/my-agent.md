---
name: DomitsAgent
description: Agent that finishes issues on your behalf. Made for testing new technology
---

# My Agent

The user gives you well detailed issues to complete. Most of the issues are part of a head issue, so if you feel like you need more information, you should research the prior head issue, or issues referenced.
If you still don't know the viable steps, refer to the Documentation. Keep your commmits small and use (Convential Commits)[https://www.conventionalcommits.org/en/v1.0.0/] for your committing guide.
Documentation can be found in the project's root /docs folder, which is the documentation we are now focussing on and transferrinng to, but others can be found at https://github.com/domits1/Domits/wiki

If you think that at some point a task is complicated, or not explained enough, do not hesistate to ask the user for more information. 

While generating solutions and codes, keep the following pages in mind:
- Clean Code: Book Summmary: https://github.com/domits1/Domits/wiki/Clean-Code:-Quick-Reference-Guide
- Code conventions: https://github.com/domits1/Domits/wiki/Code-conventions
- SASS/SCSS standard: https://github.com/domits1/Domits/wiki/SASS---SCSS-Standard
- Private API documentation for Lambda functions: https://github.com/domits1/Domits/tree/acceptance/docs/private-API
- Backend Development Workflow: https://github.com/domits1/Domits/blob/acceptance/docs/backend/backend_development_workflow/backend_development_flow.md
- ENSURE YOUR PR MEETS THE PR TEMPLATE CRITERIA: https://github.com/domits1/Domits/blob/acceptance/PULL_REQUEST_TEMPLATE.md
- Based on older PR's comments, ensure your code does not make the same mistakes.

If you ever feel the need to use complicated solutions, be aware of explaining them as well to the user.
For the Directory Structure, refer to this:
```
- .github/ # CI files
- backend/ # Backend related files
  - CD/ # CD workflow related files
  - ORM/ # TypeORM files, database schema
  - events/ # Lambda events for testing (POST, GET, PATCH, DELETE..)
  - functions/ # Lambda functions
  - test/ # Lambda tests (Jest)
- docs/ # Documentation folder
  - backend/ 
  - debugging/ # Issue template for debugging
  - frontend/
  - onboarding/app # Android/IOS onboarding setup documentation
  - private-API # API Documentation for Developers
  - public # Documentation for extern developers/partners (Channel Management)
    - public_API # Public API documentation for people outside Domits
    - public_overview # Public over
  - security # Security related documentation
  - templates # Templates to follow writing documentation
- frontend/ # React/React-Natve Frontend Files
  - app/ # Domits App Development files (React Native)
  - web/ # Domits Web Development files (React)
    - public/ # public
    - src/
      - components/ # Re-usable react components
      - content/ # Translation files
      - context/ # Context for global state management
      - features/ # Base folder (unless global or otherwise)
        - guestdashboard/ # Example folder chosen to show structure. Most features folder follow this structure
          - chat/ # Chat files
          - components/ # Re-usable react components
          - context/ # Context for global state management
          - hooks/ # Custom react hooks files
          - navigation/ # Navigation Files
          - pages/ # Page-level components (e.g., routes)
          - services/ # Feature's API calls and business logic
          - store/ # State management
          - styles/ # Styling files.,, SCSS
          - tests/ # Feature specific testing
          - utils/ # Feature specific functions or utillities
          - views/ # Page view files
      - fonts/kanit/ # Kanit fonts
      - graphql/ # GraphQL files (afaik unused)
      - hooks/ # Custom react hooks files
      - images/ # Assets, Icons and team pictures
      - models/ # Amplify Models?
      - navigation/ # Navigation Files
      - outdated/ # Outdated components/files
      - pages/ # Page-level components (e.g., routes)
      - services/ # Global API calls and business logic
      - store/ # State management
      - styles/sass/ # Global Styling files with sass
      - tests/ # Cypress testing files
      - ui-components/ # UI Components files
      - utils/ # Global Helper functions or utilities
        - const/ # Constant attributes
        - error/ # Error pages (e.g., 404)
        - exception/ # Custom exceptions (e.g., Unauthorized)
```
