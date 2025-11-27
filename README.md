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

Table of Contents
=================

- [What is Domits?](#what-is-domits)
- [Table of Contents](#table-of-contents)
  - [Tech Stack](#tech-stack)
  - [Repository structure](#repository-structure)
  - [Intro Sprint](#intro-sprint)
    - [General Introduction](#general-introduction)
    - [Github Introduction](#github-introduction)
    - [Programming Introduction](#programming-introduction)
    - [Backend Introduction](#backend-introduction)
    - [Web/App Setup](#webapp-setup)
    - [Other subjects to understand](#other-subjects-to-understand)
  - [Core modules and APIs](#core-modules-and-apis)
  - [Code Conventions](#code-conventions)
  - [Documentation Overview](#documentation-overview)
  - [Contribution guidelines](#contribution-guidelines)


## Tech Stack
🖥️ **Frontend:** React Native, JavaScript, TypeScript, SASS/SCSS  
🧠 **Backend:** Node.js, AWS Lambda, TypeORM, PostgreSQL  
☁️ **Cloud:** Amazon Web Services  
🧪 **Testing:** Jest, Cypress  
🚀 **CI/CD:** GitHub Actions  
📦 **Package Management:** npm  

## Repository structure
```
- .github/ # CI files
- backend/ # Backend related files
  - CD/ # CD workflow related files
  - ORM/ # TypeORM files, database schema
  - events/ # Lambda events for testing (POST, GET, PATCH, DELETE..)
  - functions/ # Lambda functions
  - test/ # Lambda tests (Jest)

- docs/ # Documentation folder
  - debugging/ # Issue template for debugging
  - images/ # Image save location for doc images
  - internal/ # Our internal developer documentation for every dev at Domits.
  - partner/ # Partner related documentation for partners with Domits (part of channel management)
  - public # Documentation for extern developers/partners
  - security # Security related documentation

- frontend/ # React/React-Natve Frontend Files
  - app/ # Domits App Development files (React Native)
    - Domits/
      - android/ # Android build related files
      - asset/fonts/ # Fonts used in Domits
      - ios/ # IOS build related files
      - src/ # Same directory structure as ../../web/src/
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
## Intro Sprint
Welcome to the Intro Sprint! 

This sprint will help you to get familiar with domits within one week so you can start contibuting to issues.

If you ever get stuck, google, stack overflow, ask a LLM and then afterwards, ask a team member.

### General Introduction
Learn the basics of Domits, who we are, what we build, and where to find key documentation.

* Get access to tooling (AWS, Github, Discord, Figma, ...) 
* Understand the [Hospitality & Vacation rental market](https://bookdomits.com/)
* Visit [domits.com](https://www.domits.com) and understand the product.
* Read through the [Domits Handbook](https://docs.google.com/document/d/1VxkKQtqS_B9NvDvtcBZ7BUZCSGPUG-PHEkayGi3D6mU/edit?tab=t.0#heading=h.xau35oj9sp4z).
* Understand [product backlog, roadmap and vision](https://github.com/domits1/Domits/wiki/Product-Backlog,-Roadmap-and-Vision).
* Check who is [responsible for what parts of Domits, and check the issues placed on your name.](https://github.com/domits1/Domits/wiki/Technical-Leadership)


After this section you should understand:
- The company's products and market.
- The long-term roadmap and sprint workflow.
- Your technical arrea of responsibility.

---

### Github Introduction
Everything in Domits revolves around Issues. Each Issue belongs to a Milestone which is part of a whole component.


* [Issues](https://github.com/domits1/Domits/issues)
* [Milestones](https://github.com/domits1/Domits/milestones)
* [Pull Requests](https://github.com/domits1/Domits/pulls)
* [Sprints](https://github.com/domits1/Domits/wiki/Domits-Sprints)
  
> [!tip]
> When you start coding, make a branch from Acceptance. Don't make commits while being on Acceptance, you will most likely lose code.
> When you're done, submit a Pull Request (PR) to merge your work. Fill in the template and check everything before asking for a reviewer.


After this section you should understand:
- How to find, pick, and work on an Issue.
- How to create a branch and PR.
---

### Programming Introduction
Get familar with code conventions to write clean code. Become aware of our serverless backend.

* Follow the [AWS Intro Course (Cloud Practitioner Essentials)](https://explore.skillbuilder.aws/learn/course/external/view/elearning/134/aws-cloud-practitioner-essentials)
* Learn and improve [Programming/Clean Code: Quick Reference Guide](https://github.com/domits1/Domits/wiki/Programming)
* Become familiar with our [Code Conventions](https://github.com/domits1/Domits/wiki/Code-conventions) to maintain a consistent and readable codebase.
* Understand the code pipeline (CI/CD)

### Backend Introduction
* [Backend Setup](./docs/internal/onboarding/backend_setup.md) The createlambda function will create a template lambda for you. Familiarize yourself with the structure [here](./docs/internal/tools/backend_development_flow.md) before starting to code.

### Web/App Setup
Get Domits running locally for development.

**Web**

Web Development Setup:
* [Running Domits Locally - Web](./docs/internal/onboarding/running%20Domits%20locally.md)

**App**

> [!Note]
> IOS development requires macOS. On windows, consider using AWS EC2 or a VM for testing.

App Development Setup:
* [App Onboarding](./docs/internal/onboarding/app/app_onboarding.md)

After this section you should have:
- The repo cloned locally.
- Either the app or web environment fully working.

That are all the fundamental things to be aware of.
You can decide to take a [Quick Fix](https://github.com/domits1/Domits/issues/122) now, or be aware of other subjects to understand.

### Other subjects to understand

* [Domain Driven Design (DDD)](https://en.wikipedia.org/wiki/Domain-driven_design)
Structure code around real-world business logic.

* [Agile Scrum](https://github.com/domits1/Domits/wiki/Agile-Scrum)
Agile keeps our workflow flexible and fast. Learn how we do that, and check the [Scrum Guide](https://scrumguides.org/scrum-guide.html)

* [AWS Cloud Infrastructure & Architecture Design](https://github.com/domits1/Domits/wiki/AWS-Business-Logic)
Understand the AWS Infrastructure and Architecture. This also contains the AWS Architecture for Domits.

* [DevOps](https://github.com/domits1/Domits/wiki/DevOps)
Understand how DevOps work. This wiki page explains what DevOps are, and how it makes developer work smoother by using CI/CD and other tools.

* [Observability](https://github.com/domits1/Domits/wiki/Observability)
Understand how to monitor and debug your AWS functions.

* [Site Reliability Engineering (SRE)](https://github.com/domits1/Domits/wiki/Site-Reliability-Engineering-(SRE))
How reliability is maintained under scale — balancing uptime, latency, and resilience.

* [Cyber Security Testing Red, Blue & Purple Team](https://github.com/domits1/Domits/wiki/Cyber-Security)
Be aware of how Cyber Security teams work.

* [Quality Assurance, Automated Testing](https://github.com/domits1/Domits/wiki/Testing-101)
Understand how Quality Assurance (QA) testing works, and automated testing.

* [APIs](https://github.com/domits1/Domits/wiki/APIs)
Understand the type of API's, REST and HTTP API's.


**AI, ML & Data Foundations**

* [Data foundation for AI](https://github.com/domits1/Domits/wiki/Data-foundation-for-AI)
  
* [Gen AI](https://github.com/domits1/Domits/wiki/Generative-AI)

* [ML](https://github.com/domits1/Domits/wiki/Machine-Learning) 

* [AI Infrastructure](https://github.com/domits1/Domits/wiki/AI-Infrastructure)

* [AI Services](https://github.com/domits1/Domits/wiki/AI-Services)

Explore how AI and data engineering can enhance the platform with personalization, automation, and intelligent insights.

## Core modules and APIs
Key modules powering Domits:

**[Booking Engine](/docs/internal/apis/bookingengine/booking_and_reservation.md)**

* Responsible for: Handling Host + Guest bookings, performing CRUD operations. Sending a email to host/guest on received booking. Stripe/Payment logic.
* Used for: Creating reservations, creating a paymentIntent with Stripe reading reservations on the host/guest side.

**[Calendar](/docs/internal/apis/calendar/host_guest_calendar_workflow.md)**

* Responsible for: Handling Calendar actions.
* Used for: Calendar Component

**[Finance](/docs/internal/apis/finance/hostFinance.md)**

* Responsible for: Handling Finances/payouts with Stripe
* Used for: Host Dashboard - Finance Tab

**[Messaging](/docs/internal/apis/messaging/messaging_overview.md)**

* Responsible for: Handling messages
* Used for: Host/Guest messages

**[Property Handler](/docs/internal/apis/propertyhandler/property_handler.md)**

* Responsible for: Handling properties
* Used for: Handling CRUD operations for properties, creating properties with the property listing, showing properties and getting propertyinformation in the homepage.

## Code Conventions

* [Clean Code: Reference Guide](./docs/internal/standards/clean_code_reference_guide.md) - Helps you write maintainable, readable and efficient code
* [Code Conventions](./docs/internal/standards/code_conventions.md) - Helps you maintain a consistent and readable codebase in Domits.
* [SASS/SCSS Standard](/docs/internal/standards/sass_scss_standard.md) - Helps you use SASS/SCSS for efficient styling. 

## Documentation Overview

Domits has documentation, those which are essential for understanding. As of now, we have 3 key folders to pay attention to:
```
* internal/ - Internal documentation for Devs at Domits (you most likely be spending your time here most of the time)
  * apis/ - All documentation for our Lambda API's goes here. Including is a fancy template.
  * architecture/ - Our system architecture belongs here.
  * changelog/ - Any changelog in the docs goes here.
  * data/ - 
  * infra/
  * onboarding/
  * qa/
  * security/
  * services/
  * standards/
  * tools/
* partner/
  * API/
  * intregrations/
* public/
  * overview/
````


// TODO: add important documentation, add explanation about internal/public/partner api's and service folder

* [Developer Resources](./docs/developer_resources.md) - Find useful links for a developer.

## Contribution guidelines

Follow the established code conventions.

Always fill out the PR template completely before review.

Keep your commits clean and descriptive according to [Convential Commits](https://www.conventionalcommits.org/en/v1.0.0/).

