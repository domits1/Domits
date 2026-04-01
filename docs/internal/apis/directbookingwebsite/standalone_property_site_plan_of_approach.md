# Plan Of Approach - Standalone Website

## Status
Working baseline

## Last Updated
2026-03-20

## Purpose
This document captures the current plan of approach for the standalone website research within Domits. It is the research-oriented counterpart to the technical design pack and ADR. The goal is to keep the research baseline, research questions, chapter structure, and intended validation approach explicit in markdown.

## Core Question
How can Domits design a template-based, one-click standalone booking website that is scalable, secure, and cost-efficient to host, while integrating correctly with availability and bookings from the Property Management System?

## Core Subquestions
1. Which minimum functionality should the standalone website contain to make v1 valuable and feasible within Domits?
2. Which template architecture is most suitable for reusable websites with limited but useful customization, without turning every template into a separate project?
3. Which hosting strategy is most suitable for Domits given cost, performance, scalability, and manageability requirements?
4. How can multi-tenant routing and domain management be designed so generated subdomains and later custom domains function reliably and scalably?
5. How can the standalone website remain correctly aligned with availability and pricing data from the PMS, including changes, caching, and failure scenarios?
6. Which security measures are required to realize a safe multi-tenant standalone website platform within Domits?
7. Which KPIs are suitable for evaluating the technical and product quality of the solution?

## Broader Research Scope
The broader research scope covers the full standalone website direction, including:

- property detail page
- availability check and price calculation
- booking funnel
- confirmation
- template choice
- site name
- logo and favicon
- publish and unpublish
- live and draft status
- language choice
- tooling choice

## Implementation-Ready V1 Baseline
The implementation-ready v1 is intentionally smaller. It is the clean foundation that Domits can build further on in v2.

V1 foundation includes:

- property detail page:
  - photos
  - amenities
  - location
  - house rules
- published render content baked into the standalone site at publish or refresh time
- availability check and price calculation
- template choice
- site name
- logo and favicon
- publish and unpublish
- live and draft status
- English as the first and only site language in v1
- tooling choices aligned with the current Domits stack

Implementation detail for this baseline:
- descriptive page content such as title, description, photos, amenities, location, and house rules is imported from PMS into standalone-owned published data
- public page render uses that published standalone snapshot
- pricing and availability remain live PMS reads through server-side quote APIs

V2 extends this base with:

- booking funnel
- booking creation
- confirmation

## Chapter Structure

### 1. Introduction

#### 1.1 Motivation
The host wants to increase direct revenue and reduce operational workload by receiving more bookings through an owned channel. To support this, Domits is designing a template-based, one-click standalone booking website. Hosts should be able to publish a professional website quickly while keeping availability, pricing, and bookings correctly aligned with the PMS.

#### 1.2 Assignment introduction
The assignment focuses on designing a standalone booking website solution within Domits, based on templates that can be published with one click. The website functions as a direct booking channel and must integrate correctly with PMS data such as availability, pricing, and bookings. The research explains the choices and constraints needed to realize this in a scalable, secure, and cost-efficient way.

#### 1.3 Client
Domits, together with internal stakeholders such as product and engineering, and future hosts who will use the platform.

#### 1.4 Organization description
Domits is a short-term rental platform that helps hosts manage accommodations, reservations, and communication. The platform already contains PMS functionality and is being expanded with a direct booking solution through standalone websites.

#### 1.5 Goals
- allow hosts to publish a standalone booking website with minimal friction
- realize a template approach that supports customization without turning every template into a separate project
- design hosting and deployment so the solution is scalable and cost-efficient
- guarantee correct and consistent integration with availability, pricing, and booking data from the PMS
- keep public property pages fast to render by serving baked published content instead of live descriptive PMS reads
- ensure security by design in a multi-tenant environment

#### 1.6 Research questions
The main question and subquestions in this document are the current working research questions.

#### 1.7 Research setup
The research follows a design-oriented approach:
- inventory of requirements and v1 scope
- analysis of design options for templates, hosting, domains, security, and integration
- choice justification using criteria such as cost, scalability, reliability, and maintainability
- validation with measurable KPIs and scenarios for publish flow, v1 quote correctness, and later booking-flow extension

#### 1.8 Reading guide
Chapter 2 explains key concepts and definitions. Chapter 3 covers the problem analysis, including the central question, subquestions, and quality criteria such as validity and reliability. Chapter 4 explains the research design and the selected methods. Chapters 5 through 7 analyze solution directions, describe the solution design, and define validation and evaluation.

### 2. Theoretical Framework

#### 2.1 Introduction
This chapter helps the reader understand the domain, terminology, and design context of the research.

#### 2.2 Definitions
- PMS: system for managing accommodations, reservations, prices, and host processes
- standalone booking website: separate website through which guests can book directly, connected to PMS data
- template-based website: website with predefined layout and structure plus configurable content and styling
- one-click deployment or provisioning: automated publication without manual infrastructure steps per host
- multi-tenancy: one platform serving multiple hosts with strict data and configuration isolation
- availability: which dates are bookable, including blocks, min/max stay, and lead-time rules
- pricing: pricing rules and price calculation for a date range
- booking engine: the flow that shows availability, calculates price, and creates bookings
- rate limiting: limiting request volume to reduce abuse and overload
- CSP: content security policy to reduce browser-side risks such as XSS
- secure tokens: short-lived signed tokens for safe client-server interaction
- KPI: measurable indicator used to evaluate technical and product success

### 3. Problem Analysis

#### 3.1 Goal and result of the research
The goal is to design a technical and functional approach for standalone booking websites inside Domits. The intended result is a justified design consisting of architectural choices, v1 scope, and an evaluation framework with KPIs for scalability, security, cost-efficiency, and PMS correctness.

#### 3.2 Research approach
- requirements analysis for MVP, stakeholders, and constraints
- comparison of solution directions for template architecture, hosting, domains, and security
- selection using criteria such as cost, scalability, complexity, and risk
- validation using a measurement plan and publish, booking, and correctness scenarios

#### 3.3 Research planning
To be filled with sprint or week planning, deliverables, architecture choice milestones, prototype moments, and evaluation steps.

#### 3.4 Problem analysis using the 6W method

##### 3.4.1 What is the problem?
Hosts do not have a simple way to publish a professional direct-booking website that stays reliably connected to availability, pricing, and bookings in the PMS.

##### 3.4.2 Who has the problem?
- hosts and property managers who want direct bookings through their own channel
- Domits, because support pressure and data inconsistency risks increase without a proper solution

##### 3.4.3 When did the problem arise?
The problem emerged when direct bookings became a product ambition next to the existing PMS functionality, without wanting hosts to build or manage their own websites.

##### 3.4.4 Why is it a problem?
Without a proper solution, hosts remain dependent on OTAs, manual work increases, and wrong availability or pricing can lead to lost revenue and reputational damage.

##### 3.4.5 Where does the problem occur?
It occurs in the Domits web channel: publishing and hosting websites, integrating with PMS data, managing domains, and securing a multi-tenant environment.

##### 3.4.6 What is the trigger?
The trigger is the strategic need to stimulate direct bookings and give hosts a professional web presence with minimal technical friction.

#### 3.5 Central question
The central question is equal to the main research question above.

#### 3.6 Subquestions
The subquestions are equal to the current working subquestions above and are further operationalized in the research design.

#### 3.7 Goal formulation
The intended outcome is a justified design and implementation approach for one-click template websites within Domits that:
- is scalable and cost-efficient to host
- is safe in a multi-tenant setting
- integrates correctly with availability, pricing, and booking data from the PMS
- is measurable through KPIs

#### 3.8 Validity and reliability
- validity: KPIs and scenarios must connect directly to publish flow, v1 correctness, later booking extension, security, and cost
- reliability: measurements should be repeatable through consistent performance tests, deployment metrics, error rates, and end-to-end scenarios

#### 3.9 Conclusion
To be filled with a short synthesis of the core problem, scope choices, and research relevance for Domits.

### 4. Research Design

#### 4.1 Justification of methods and types
- design-oriented research focused on creating, justifying, and evaluating a solution in a real company context
- analysis of alternatives using predefined criteria
- evaluation through KPI measurement and scenario testing

#### 4.2 Research type
Design-oriented and practice-oriented research with emphasis on architecture choices, operational feasibility, and measurable evaluation.

#### 4.3 Research method
- requirements and v1 scope definition
- architecture comparison using cost, scalability, maintenance, security, and correctness criteria
- prototype or proof of concept where useful
- validation through KPIs and end-to-end scenarios

### 5. Analysis Of Solution Directions

#### 5.1 Template architectures
Compare:
- fixed templates
- block-based architectures
- builders

End with a justified template choice for Domits.

#### 5.2 Hosting strategies
Compare:
- static
- SSR
- hybrid

Evaluate cost, performance, and complexity tradeoffs.

#### 5.3 Multi-tenant architecture
Compare:
- shared runtime
- isolated runtime

#### 5.4 Domain and routing approach
Analyze:
- subdomains
- custom domains
- fallback behavior

#### 5.5 Data integration with the PMS
Analyze:
- realtime versus caching
- server-side versus client-side logic

Current implementation direction:
- descriptive property content is imported from PMS into standalone-owned published data at publish or refresh time
- public render uses that standalone snapshot
- quote pricing and availability remain live PMS reads

#### 5.6 Security and isolation
Analyze:
- secure tokens
- rate limiting
- CSP
- abuse prevention
- privacy

#### 5.7 KPI selection and justification
Explain why the chosen KPIs match the technical and product goals of the feature.

### 6. Solution Design

#### 6.1 Architecture overview
Include a system diagram that shows:
- user
- frontend
- backend or Lambda layer
- database or Aurora
- external systems

#### 6.2 Template system
Include:
- configuration model
- rendering model
- component or template diagram

#### 6.3 Hosting and deployment
Include:
- pipeline
- infrastructure
- deployment diagram

#### 6.4 Domain management
Include:
- routing
- fallback behavior
- flowchart from request to tenant resolution to site load

#### 6.5 Dataflow and PMS integration
Include:
- availability
- pricing
- sequence diagram from user to frontend to API to PMS to response

This is where the design must prove price and availability correctness.

#### 6.6 Security design
Include:
- tenant isolation
- tokens
- trust boundaries

#### 6.7 Lifecycle and states
Include:
- publish and unpublish flow
- state diagram such as draft to preview to published to unpublished

### 7. Validation And Evaluation

#### 7.1 KPIs
Use the current KPI set as baseline:
- time_to_publish_p95
- quote_to_charge_mismatch_rate
- booking_api_error_rate
- site_lcp_mobile_p75
- cost_per_active_site_per_month
- fallback_subdomain_availability
- custom_domain_setup_success_rate
- booking_funnel_completion_rate

For reporting, make clear which KPIs are foundation-release KPIs and which become meaningful only once v2 booking flows are enabled.

#### 7.2 Test scenarios
Include:
- publish flow
- booking flow as v2 extension
- failure cases

#### 7.3 Results
Add prototype or validation results if and when they exist.

### 8. Conclusion
This chapter should answer the main question and summarize the most important technical choices.

### 9. Discussion And Reflection
This chapter should cover:
- limitations
- risks
- follow-up work

## Appendix Material
Appendices can contain:
- diagrams
- ERD
- ADRs
- API specifications
- larger technical versions of design artefacts

## Design Artefacts To Include
- ADR
- ERD
- system context diagram
- publish sequence diagram
- resolve host to site to property sequence diagram
- quote sequence diagram
- v2 checkout and booking sequence diagram
- site state diagram
- domain state diagram
- rollout diagram or table
- risk and threat matrix
- failure-mode table
- ownership matrix
- content mapping table
- template contract table
- observability plan

## Alignment Notes
- This plan of approach is the research baseline.
- The broader research scope is larger than the implementation-ready v1.
- The implementation-ready v1 is intentionally small so Domits can establish a clean base for v2.
- The design pack contains the technical interpretation and implementation policy.
- The ADR contains the locked architectural decisions and rejected alternatives.
