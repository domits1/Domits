  <!-- Hero 1 -->
<h1 align="center">
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

  
<p align="center">A global strategic advisor to grow the hospitality ecosystem.</p>


# What is Domits?
Domits is a hospitality-management platform that allows hosts and guests to manage properties, bookings, availability, and communication in one unified system. The application uses a React/React Native frontend and a fully serverless AWS backend. The backend is built in Node.js/TypeScript and structured as individual AWS Lambda functions connected to API Gateway. It integrates with Aurora DSQL and various AWS services (Amplify, Cognito, S3, etc.), as well as external services like Stripe for payments.
This README is intended for developers working on the Domits codebase.

Table of Contents
=================

- [What is Domits?](#what-is-domits)
- [Table of Contents](#table-of-contents)
  - [Tech Stack](#tech-stack)
  - [Repository Structure](#repository-structure)
  - [Intro Sprint](#intro-sprint)
    - [General Introduction](#general-introduction)
    - [Github Introduction](#github-introduction)
      - [Reviewing A PR As Reviewer](#reviewing-a-pr-as-reviewer)
    - [Programming Introduction](#programming-introduction)
    - [Web/App Setup](#webapp-setup)
  - [Code Conventions](#code-conventions)
  - [Core Modules and APIs](#core-modules-and-apis)
    - [Connectivity API's](#connectivity-apis)
    - [Distribution API](#distribution-api)
    - [Booking Engine API](#booking-engine-api)
  - [Documentation Structure Overview](#documentation-structure-overview)
  - [Contribution Guidelines](#contribution-guidelines)
    - [Other Subjects to Understand](#other-subjects-to-understand)
  - [License](#license)
  - [Code of Conduct](#code-of-conduct)
  - [Contributing](#contributing)
  - [Security](#security)


## Tech Stack
🖥️ **Frontend:** React Native, JavaScript, TypeScript, SASS/SCSS  
🧠 **Backend:** Node.js, AWS Lambda, PostgreSQL  
☁️ **Cloud:** Amazon Web Services  
🧪 **Testing:** Jest, Cypress  
🚀 **CI/CD:** GitHub Actions, Amplify  
📦 **Package Management:** npm  
🪛 **Tooling:** TypeORM

## Repository Structure
```
- .github/ # CI files
- backend/ # Backend related files
  - CD/ # CD workflow related files
  - ORM/ # TypeORM files, database schema
  - events/ # Lambda events for testing (POST, GET, PATCH, DELETE..)
  - functions/ # Lambda functions
  - test/ # Lambda tests (Jest)

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
      - graphql/ # GraphQL files (unused?)
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

The Intro Sprint is designed to help you get onboarded as a Domits Developer quickly and efficiently.

If you get stuck, try Googling, checking Stack Overflow, or asking an LLM first, then reach out to a team member if needed.

### General Introduction
Learn the basics of Domits, who we are, what we build, and where to find key documentation.

* Understand the [Company](https://bookdomits.com/company/), [Hospitality Market](https://bookdomits.com/blog/), [Ecosystem](https://bookdomits.com/ecosystem/), [Product Features](https://bookdomits.com/features/), [Glossary](https://bookdomits.com/glossary/), [Job Roles](https://bookdomits.com/hospitality-roles/), [Agentic Workforce](https://bookdomits.com/agentic-travel-hospitality-workforce/), [Alternatives](https://bookdomits.com/domits-alternatives/) and [Why Domits](https://bookdomits.com/why-domits/)
* Understand the [product vision, roadmap and backlog](https://github.com/domits1/Domits/issues/2272).
* Learn the basics of [Cloud Security Glossary](https://niagaros.com/glossary/), [Compliance Frameworks](https://niagaros.com/frameworks/) , [Cybersecurity Job Roles](https://niagaros.com/cybersecurity-job-roles/), [Unified Cloud Security Categories](https://niagaros.com/unified-cloud-security-categories/) and [Cloud Security Risk Assessment](https://niagaros.com/cloud-security-risk-assessment/)
* Understand the Domits growth flywheel with [partners](https://bookdomits.com/partners/) and [accelerator](https://bookdomits.com/accelerator/).
* Check who is [responsible for which parts of Domits and review the issues assigned to your name](https://github.com/domits1/Domits/wiki/Technical-Leadership).


After this section you should understand:
- The company's products and market.
- The long-term roadmap and sprint workflow.
- Your technical area of responsibility.

---

### Github Introduction
Everything in Domits revolves around Issues. Each Issue belongs to a Milestone which is part of a whole component.


* [Issues](https://github.com/domits1/Domits/issues)
* [Milestones](https://github.com/domits1/Domits/milestones)
* [Pull Requests](https://github.com/domits1/Domits/pulls)
* [Sprints](https://github.com/domits1/Domits/wiki/Domits-Sprints)
  
> [!tip]
> When you start coding, make a branch from Acceptance. Don't make commits while being on Acceptance, you will most likely lose code.
> When you're done, pull from acceptance again so that your branch is up to date and submit a Pull Request (PR) to merge your work. Fill in the template and check everything before asking for a reviewer.


After this section you should understand:
- How to find, pick, and work on an issue.
- How to create a branch and PR.
---

#### Reviewing A PR As Reviewer

If you have been working at Domits for a while, you surely got familiar with Pull Requests. Now, if its time for you to review those, I'm sure that you have a lot of questions on the *how* aspect. Don't worry, there is a documentation available for you to get ready as reviewer [here.](./docs/internal/onboarding/pr_reviewer_onboarding.md)

### Programming Introduction
Get familar with code conventions to write clean code. Become aware of our serverless backend.

* Follow the [AWS Intro Course (Cloud Practitioner Essentials)](https://explore.skillbuilder.aws/learn/course/external/view/elearning/134/aws-cloud-practitioner-essentials)
* Learn and improve [Programming/Clean Code: Quick Reference Guide](https://github.com/domits1/Domits/wiki/Programming)
* Become familiar with our [Code Conventions](https://github.com/domits1/Domits/wiki/Code-conventions) to maintain a consistent and readable codebase.
* Get to know why we use SCSS compared to css and its benefits [here](https://www.youtube.com/watch?v=akDIJa0AP5c)
* [Backend Setup](./docs/internal/onboarding/backend_setup.md) The createlambda function will create a template lambda for you. Familiarize yourself with the structure [here](./docs/internal/tools/backend_development_flow.md) before starting to code.
* Understand the development workflow from finished work to deployment on acceptance [here](https://github.com/domits1/Domits/blob/docs/2377-frontend-backend-connection/docs/internal/onboarding/development_workflow.md)
* Understand the code pipeline (CI/CD)

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
Here's what you can do next:
* Tackle a [Beginner Issue](https://github.com/domits1/Domits/issues/2326) where you have to add your own name+profile picture as developer, and make a pull request for it.
* Take a quick fix [Quick Fix](https://github.com/domits1/Domits/issues/122) and eventually make a PR where you mention the issue's name.
* Read more of the docs, and get a better understanding of Domits.

## Code Conventions

* [Clean Code: Reference Guide](./docs/internal/standards/clean_code_reference_guide.md) - Helps you write maintainable, readable and efficient code
* [Code Conventions](./docs/internal/standards/code_conventions.md) - Helps you maintain a consistent and readable codebase in Domits.
* [SASS/SCSS Standard](/docs/internal/standards/sass_scss_standard.md) - Helps you use SASS/SCSS for efficient styling. 

## Core Modules and APIs

Get a basic understanding of every AWS service we use [here](/docs/internal/services/overview.md).

Inside Domits, we have different API's used as key modules for powering Domits. We will devide the following API's into two API sections: 

---

### Connectivity API's
APIs that give access to data and services in Domits and supports multiple use cases.

**[Property Handler](/docs/internal/apis/propertyhandler/property_handler.md)**

* Responsible for: Handling properties
* Used for: Handling CRUD operations for properties, creating properties with the property listing, showing properties and getting propertyinformation in the homepage.

**[Reservations](/docs/internal/apis/bookingengine/booking_and_reservation.md)**

* Responsible for: Handling Host + Guest bookings, performing CRUD operations. Sending a email to host/guest on received booking. Stripe/Payment logic.
* Used for: Creating reservations, creating a paymentIntent with Stripe reading reservations on the host/guest side.


**[Availability Calendar](/docs/internal/apis/calendar/host_guest_calendar_workflow.md)**

* Responsible for: Handling Calendar actions.
* Used for: Calendar Component

**[Finance](/docs/internal/apis/finance/hostFinance.md)**

* Responsible for: Handling Finances/payouts with Stripe
* Used for: Host Dashboard - Finance Tab

**[Rates](/docs/internal/apis/revenuemanagement/rates.md)**

* Responsible for: Handling rates
* Used for: Host Revenue Management

**[Messaging](/docs/internal/apis/messaging/messaging_overview.md)**

* Responsible for: Handling messages
* Used for: Host/Guest messages

---

### Distribution API 

**[Distribution](/docs/partner/api/distribution.md)**
* Responsible for: Handling Distribution
* Used for: An API to connect anything (PMS, Channel Manager, RMS, Distribution Channels, ...) to the Domits system.

### Booking Engine API

**[Booking Engine](/docs/internal/apis/directbookingwebsite/bookingengine.md)**

* Responsible for: Handling external direct reservations 
* Used for: An API for external booking websites and booking engines to create direct reservations in Domits 


## Documentation Structure Overview

Domits contains documentation, those which are essential for understanding. As of now, we have 3 key folders to pay attention to:
```
* internal/ - Internal documentation for Devs at Domits (you will be spending most of your time here)
  * apis/ - All documentation for our Lambda API's goes here. Including a fancy template.
  * architecture/ - Our system architecture belongs here.
  * changelog/ - Any changelog in the docs goes here.
  * data/ - Currently contains our business logic and model.
  * infra/ - Infrastructure, workflows and devops goes here.
  * onboarding/ - General developer onboarding.
  * qa/ - Testing documentation.
  * security/ - All security related documentation.
  * services/ - Currently contains an overview of the AWS services we integrate into Domits.
  * standards/ - Company-wide engineering best practices.
  * tools/ - Overview over our tools and portals.

* partner/ - Documentation for Domits partner (Channel Manager).
  * API/ - API documentation for partners.
  * integration/ - Integration guide for partners.

* public/ - Public documentation for everyone
  * overview/ 
```
* Internal Documentation Issue: [#2212](https://github.com/domits1/Domits/issues/2212)
* Partner Documentation Issue: [#2225](https://github.com/domits1/Domits/issues/2225)
* Public Documentation Issue: [#2194](https://github.com/domits1/Domits/issues/2194)

* [Developer Resources](./docs/developer_resources.md) - Find useful links for a developer.

## Contribution Guidelines

Follow the established code conventions.

Always fill out the PR template completely before review.

Keep your commits clean and descriptive according to [Convential Commits](https://www.conventionalcommits.org/en/v1.0.0/).

### Other Subjects to Understand

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

---

## License

This project is licensed under the **MIT License**.

You are free to:
- Use the code for personal or commercial purposes
- Modify and distribute the code
- Include it in proprietary or open-source projects

Under the following conditions:
- The original copyright and license notice must be included in any copies or substantial portions of the software

All contributions are assumed to be licensed under the same MIT License unless explicitly stated otherwise.

This software is provided **“as is”**, without warranty of any kind.

See the [LICENSE](./LICENSE) file for full details.

---

## Code of Conduct

This project follows a **Code of Conduct** to ensure a respectful, inclusive, and professional environment for everyone involved.

All contributors, maintainers, and participants are expected to uphold these standards when interacting in the project’s repositories, issues, pull requests, and other community spaces.

See the [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) file for full details.

---

## Contributing

Contributions to Domits are welcome, including code, documentation, bug reports, and improvements.

Please follow the project’s contribution guidelines to ensure a smooth and consistent collaboration process.

See the [CONTRIBUTING.md](./CONTRIBUTING.md) file for full details.

---

## Security

Domits takes security seriously.

If you discover a security vulnerability, please **do not report it via public GitHub issues**.
Follow the responsible disclosure process described in our Security Policy.

See the [SECURITY.md](./SECURITY.md) file for full details.