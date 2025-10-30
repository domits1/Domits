  <!-- Hero 1 -->
<h1 align="center">
  <img src="https://i.ibb.co/rKVk8xDm/logo-aea153ca0521f26f9487364e1a11dc2e.png" alt="Domits" width="500"/>
</h1>
  <!-- Website links -->
  <div align="center">
    <a href="https://bookdomits.com" target="_blank">
    <img src="https://img.shields.io/badge/%F0%9F%8F%A1_Book_Domits-555555?style=for-the-badge&logo=internetexplorer&logoColor=white" alt="Book Domits Website"/>
  </a>  
  <a href="https://domits.com" target="_blank">
    <img src="https://img.shields.io/badge/%F0%9F%8C%90_Domits-555555?style=for-the-badge" alt="Domits Website"/>
  </a>  
    <a href="https://acceptance.domits.com" target="_blank">
    <img src="https://img.shields.io/badge/%F0%9F%A7%AA_Acceptance-555555?style=for-the-badge" alt="Acceptance Domits Website"/>
  </a>  
</div>
  <!-- Badges -->
  <div align="center">
      <br>
    <a href="https://github.com/domits1/Domits/graphs/contributors" >
      <img alt="Contributors" src="https://img.shields.io/github/contributors/domits1/Domits?style=for-the-badge&color=139220"/>
    </a>
    <a href="https://github.com/domits1/Domits/pulls">
      <img alt="Pull Requests" src="https://img.shields.io/github/issues-pr/domits1/Domits?style=for-the-badge&color=139220"/>
    </a>
    <a href="https://github.com/domits1/Domits/stargazers">
      <img alt="Stars" src="https://img.shields.io/github/stars/domits1/Domits?style=for-the-badge&logo=github&color=139220"/>
    </a>
    <a href="https://github.com/domits1/Domits/commits/main">
      <img alt="Last Commit" src="https://img.shields.io/github/last-commit/domits1/Domits?style=for-the-badge&color=139220"/>
    </a>
  </div>

  
<p align="center">A fast-growing platform where you can book holiday homes, boats and campers.</p>


# What is Domits?
Domits is a hospitality-management platform designed to help hosts and guest manage properties, bookings and communications through a single application. The system combines a React/React-Native front-end with a serverless AWS backend. The backend is written in Node.JS/TypeScript and is structured as individual AWS Lambda functions wired to API Gateway endpoints. It uses Aurora DSQL and other AWS services (Amplify, Cognito, S3, etc.) and external APIs such as Stripe for payments.

## Tech Stack
🖥️ **Frontend:** React Native, JavaScript, TypeScript, SASS/SCSS  
🧠 **Backend:** Node.js, AWS Lambda, TypeORM, PostgreSQL  
☁️ **Cloud:** Amazon Web Services  
🧪 **Testing:** Jest, Cypress  
🚀 **CI/CD:** GitHub Actions  
📦 **Package Management:** npm  

# Repository structure
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
# Intro Sprint

# Running Domits Locally - Web

# Running Domits Locally - Web

# Backend Development Workflow

# Core modules and APIs

# Code Conventions

# Recommended Docs

# Contribution guidelines


