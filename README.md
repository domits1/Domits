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
- .github/ # CI/CD workflow files and issue templates
- backend/ # Backend related files
  - CD/ # CD workflow related files
  - ORM/ # TypeORM files, database schema
  - events/ # Lambda events for testing (POST, GET, PATCH, DELETE..)
  - functions/ # Lambda functions
  - test/ # Lambda tests (Jest)
- docs/ # Documentation folder
  - backend/ # Backend development documentation
    - aws/ # AWS-specific documentation (DSQL, Lambda, etc.)
    - orm/ # TypeORM implementation and usage guides
    - backend_development_workflow/ # Backend development workflow docs
  - debugging/ # Issue template for debugging
  - frontend/ # Frontend development documentation
  - onboarding/app # Android/iOS onboarding setup documentation
  - private_API # API Documentation for internal developers
    - booking and reservations/ # Booking and reservation API docs
    - host & guest payment logic/ # Payment logic documentation
    - hostcalendar/ # Host calendar API documentation
    - messaging/ # Messaging API documentation
    - propertyhandler/ # Property handler API documentation
  - public/ # Documentation for external developers/partners
    - public_API/ # Public API documentation for external integrators
    - public_overview/ # Public overview and getting started guides
  - security/ # Security related documentation
    - ai_safety/ # AI safety policies
    - compliance/ # Compliance documentation
    - data_protection/ # Data protection guidelines
    - detection_and_response/ # Security detection and response
    - identity_and_access_management/ # IAM documentation
    - network_and_application_protection/ # Network security docs
  - templates/ # Templates to follow when writing documentation
- frontend/ # React/React-Native frontend files
  - app/ # Domits App development files (React Native)
  - web/ # Domits Web development files (React)
    - public/ # Static files for the web app
    - src/
      - components/ # Re-usable React components
        - base/ # Base UI components
        - home/ # Home page components
        - messages/ # Message components
        - toast/ # Toast notification components
        - ui/ # UI utility components
      - content/ # Translation files and content
      - context/ # Context for global state management
      - features/ # Feature modules (base folder unless global or otherwise)
        - guestdashboard/ # Example feature showing standard structure
          - chat/ # Chat functionality
          - components/ # Re-usable React components (within this feature)
          - context/ # Context for state management
          - hooks/ # Custom React hooks
          - navigation/ # Navigation files
          - pages/ # Page-level components (e.g., routes)
          - services/ # Feature's API calls and business logic
          - store/ # State management (Redux/Context)
          - styles/ # Styling files (SCSS)
          - tests/ # Feature-specific testing
          - utils/ # Feature-specific helper functions or utilities
          - views/ # Page view files
      - fonts/kanit/ # Kanit font files
      - graphql/ # AWS Amplify GraphQL files (mutations, queries, subscriptions)
      - hooks/ # Custom React hooks (global)
      - images/ # Assets, icons, and images
        - about-img/ # Team member pictures
        - assets/ # General image assets
        - boat_types/ # Boat type images
        - icons/ # Icon files
      - models/ # AWS Amplify DataStore models
      - navigation/ # Navigation files (global)
      - outdated/ # Outdated components/files kept for reference
      - pages/ # Page-level components (e.g., routes)
      - services/ # Global API calls and business logic
      - store/ # State management (global)
      - styles/sass/ # Global styling files with SASS/SCSS
      - tests/ # Testing files
        - cypress/ # Cypress end-to-end tests
      - ui-components/ # UI component library
      - utils/ # Global helper functions or utilities
        - const/ # Configuration constants (e.g., publicKeys.json)
        - error/ # Error pages (e.g., 404)
        - exception/ # Custom exceptions (e.g., Unauthorized, Forbidden)
        - ScrollToTop/ # Scroll to top utility
```
# Intro Sprint

# Running Domits Locally - Web

# Running Domits Locally - Web

# Backend Development Workflow

# Core modules and APIs

# Code Conventions

# Recommended Docs

# Contribution guidelines


