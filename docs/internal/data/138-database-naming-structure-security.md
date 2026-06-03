# Database Main #138 - Research Document
## Naming, Structure & Security

**Related issue:** #1420  
**Author:** Ameen Abdelrahman

---

## Introduction

Domits uses Aurora PostgreSQL as its current relational database platform. Because the database is now used as an operational system of record, table naming, schema structure, and maintainability directly affect development speed, reporting quality, onboarding, and future migrations.

This document reviews the current Aurora PostgreSQL `main` schema from a naming, structure, and maintainability perspective. The goal is not to redesign the database from scratch, but to document the current situation clearly and propose realistic improvements that fit the existing Domits environment.

---

## Revision Note

This document is a revised version of the earlier research. The previous analysis relied partly on outdated references that included old or non-current names such as `Booking-production`, `Review-production`, `Calendar-production`, `Calender`, `Chat-*`, `AmplifyDataStore-*`, and `Todo-*`.

Based on the latest Aurora schema review and feedback validation, this revised document now reflects the current Aurora PostgreSQL `main` schema. Outdated names are no longer treated as active tables and are only mentioned here to clarify why the earlier version needed correction.

---

## Research Objective

The objective of this research is:

> To evaluate the current Aurora PostgreSQL `main` schema used by Domits and propose practical improvements for naming consistency, structural clarity, maintainability, and security-aware database design.

---

## Research Questions

### Main Question

How can the current Domits Aurora PostgreSQL schema be improved to achieve more consistent naming, clearer structure, and better long-term maintainability without disrupting current application usage?

### Sub-questions

1. Which naming inconsistencies are visible in the current Aurora schema?
2. Where do current table names show inconsistent singular/plural usage or inconsistent underscore patterns?
3. Which tables may represent overlapping responsibilities and should therefore be reviewed?
4. Which current naming choices do not align well with common PostgreSQL conventions?
5. Which practical recommendations can improve maintainability and security without making premature deletion decisions?

---

## Research Methodology

This research was conducted using a practical system-analysis approach suited to an HBO internship research document.

### 1. Schema Review

The current Aurora PostgreSQL `main` tables were reviewed based on the latest verified table list:

- `amenities`
- `amenity_and_category`
- `amenity_categories`
- `availability_restrictions`
- `booking`
- `channel_integration_account`
- `channel_integration_property`
- `channel_reservation_link`
- `faq`
- `general_details`
- `guest_favorite`
- `integration_sync_log`
- `integration_sync_state`
- `payment`
- `property`
- `property_amenity`
- `property_availability`
- `property_availabilityrestriction`
- `property_calendar_override`
- `property_calendar_price`
- `property_checkin`
- `property_child_policy`
- `property_draft`
- `property_generaldetail`
- `property_ical_source`
- `property_image`
- `property_image_v2`
- `property_image_variant`
- `property_location`
- `property_pricing`
- `property_rule`
- `property_rule_details`
- `property_technicaldetails`
- `property_test_status`
- `property_type`
- `property_types`
- `rules`
- `stripe_connectedaccounts`
- `unified_message`
- `unified_thread`
- `unified_thread_note`
- `user_table`

### 2. Pattern Analysis

The schema was analysed for:

- singular versus plural naming
- underscore usage
- domain grouping
- duplicate-like or overlapping table names
- alignment with common PostgreSQL naming practices

### 3. Maintainability and Security Review

The schema was also reviewed from a practical engineering perspective, focusing on:

- readability for developers
- predictability for queries and ORM usage
- risk of confusion in future migrations
- special attention to user, payment, and integration-related tables

---

## Current Database Analysis

The current Aurora schema shows a clear shift toward a relational structure. The `property` domain is the largest functional area, supported by booking, payment, messaging, integration, and account-related tables.

At a high level, the current database can be grouped into the following domains:

### Property Domain

- `property`
- `property_amenity`
- `property_availability`
- `property_availabilityrestriction`
- `property_calendar_override`
- `property_calendar_price`
- `property_checkin`
- `property_child_policy`
- `property_draft`
- `property_generaldetail`
- `property_ical_source`
- `property_image`
- `property_image_v2`
- `property_image_variant`
- `property_location`
- `property_pricing`
- `property_rule`
- `property_rule_details`
- `property_technicaldetails`
- `property_test_status`
- `property_type`

### Reference and Classification Tables

- `amenities`
- `amenity_and_category`
- `amenity_categories`
- `availability_restrictions`
- `general_details`
- `property_types`
- `rules`

### Booking and Payment

- `booking`
- `payment`
- `stripe_connectedaccounts`

### Messaging

- `unified_thread`
- `unified_message`
- `unified_thread_note`

### Channel and Synchronisation

- `channel_integration_account`
- `channel_integration_property`
- `channel_reservation_link`
- `integration_sync_log`
- `integration_sync_state`

### Other Operational Tables

- `faq`
- `guest_favorite`
- `user_table`

This structure is significantly more coherent than the outdated version described in the earlier document. However, the current schema still contains naming irregularities and several signs of inconsistent modeling decisions between related tables.

---

## Findings

### 1. The current schema is domain-oriented, but not yet naming-consistent

The table set shows recognizable domains such as property, messaging, booking, payment, and integration. This is a positive sign for maintainability. However, naming decisions differ between domains and even within the same domain.

### 2. The property domain contains the clearest naming inconsistencies

Most property-related tables use the `property_` prefix, which is helpful. However, several names deviate from the same pattern:

- `property_generaldetail`
- `property_availabilityrestriction`
- `property_technicaldetails`
- `property_type`
- `property_rule_details`

These names show inconsistent handling of compound words and inconsistent singular/plural choices.

### 3. Some table pairs suggest overlap or transitional design

Examples include:

- `property_image` and `property_image_v2`
- `property_type` and `property_types`
- `general_details` and `property_generaldetail`
- `amenity_and_category` and `amenity_categories`

These pairs do not automatically mean that one table is wrong. However, they do indicate that naming and ownership should be reviewed carefully against current application usage.

### 4. Some operational tables use technical naming instead of domain naming

Examples include:

- `user_table`
- `stripe_connectedaccounts`

These names are understandable internally, but they are less aligned with standard relational naming practices and less descriptive from a business-domain perspective.

---

## Naming Inconsistencies

The current schema contains several categories of naming inconsistency.

### 1. Singular and Plural Usage

Examples:

- `booking` versus `payment`
- `property_type` versus `property_types`
- `amenities` versus `property_amenity`
- `availability_restrictions` versus `property_availabilityrestriction`

Observation:

The schema does not follow one clearly enforced rule for table plurality. Some tables are singular, some are plural, and some linked tables use singular naming while their reference table uses plural naming.

Impact:

- lower predictability for developers
- more ORM and query confusion
- harder onboarding for new team members

### 2. Inconsistent Compound Word Formatting

Examples:

- `property_generaldetail` versus `general_details`
- `property_availabilityrestriction` versus `availability_restrictions`
- `property_technicaldetails`
- `stripe_connectedaccounts`

Observation:

Some compound concepts are split into separate words with underscores, while other tables compress the same type of concept into one combined word.

Impact:

- reduced readability
- harder to scan and compare related tables
- naming becomes dependent on historical implementation choices instead of convention

### 3. Inconsistent Prefix Patterns

Examples:

- `property_generaldetail` uses a `property_` prefix, while the related reference table is `general_details`
- `property_type` is property-scoped, while `property_types` is not property-scoped but uses a similar root name
- `channel_integration_account` uses a multi-word domain prefix, while `stripe_connectedaccounts` does not follow the same pattern

Observation:

Some domains are clearly grouped by prefix, while others use provider-oriented or technical names.

Impact:

- weaker schema discoverability
- harder to reason about relationships across domains

### 4. Names That Do Not Align Well With PostgreSQL Best Practices

Examples:

- `user_table`
- `stripe_connectedaccounts`
- `property_generaldetail`
- `property_availabilityrestriction`
- `property_technicaldetails`

Observation:

Common PostgreSQL practice favors readable, consistent `snake_case` with clear word boundaries. The schema already uses lowercase names and underscores in many places, but some names still compress multi-word concepts in a way that reduces clarity.

---

## Structural Observations

### 1. Strong property-centric modeling

The schema is clearly centered around `property` and related operational tables. This is useful, because it gives the system a stable domain core. The challenge is not the existence of many property tables, but the inconsistency in how they are named and grouped.

### 2. Reference tables and property-specific tables are sometimes named differently for the same concept

Examples:

- `general_details` and `property_generaldetail`
- `availability_restrictions` and `property_availabilityrestriction`
- `rules` and `property_rule`
- `property_types` and `property_type`

This suggests a reasonable relational idea, namely a reference list plus a property-specific relation or value table. The problem is that the naming pattern is not standardized across those pairs.

### 3. Some tables may represent transitional architecture

Examples:

- `property_image` and `property_image_v2`
- `property_image_variant`
- `property_draft`
- `property_test_status`

These tables may be valid and actively used. At the same time, they suggest that some parts of the schema may have evolved incrementally. Such tables should be reviewed to confirm their current ownership, purpose, and long-term role.

### 4. Messaging is more structured than in the outdated analysis

The current schema uses:

- `unified_thread`
- `unified_message`
- `unified_thread_note`

This is much clearer than the previously referenced legacy-style chat naming. The current messaging structure appears to be intentionally grouped and should be evaluated as an active relational domain rather than as a fragmented legacy area.

### 5. Integration tables are relatively clear and domain-consistent

The following names are comparatively strong:

- `channel_integration_account`
- `channel_integration_property`
- `channel_reservation_link`
- `integration_sync_log`
- `integration_sync_state`

These tables already communicate scope and responsibility better than several older naming patterns elsewhere in the schema.

---

## Security / Maintainability Considerations

### 1. Clear naming supports safer development

Inconsistent naming does not directly create a security issue, but it does increase the chance of implementation mistakes. If developers misunderstand which table is canonical, they may query or update the wrong structure.

### 2. User and payment-related tables deserve extra naming clarity

Tables such as `user_table`, `payment`, and `stripe_connectedaccounts` are closer to sensitive or business-critical data. Their names should be unambiguous so developers and reviewers can immediately understand their role.

### 3. Transitional tables should be validated before any cleanup

Tables such as `property_image` and `property_image_v2` may indicate overlap. However, they should not be removed based on naming alone. They should be validated against actual application usage, migration history, and dependency paths first.

### 4. Schema consistency improves maintainability over time

A consistent schema reduces:

- onboarding friction
- migration risk
- accidental duplicate development
- confusion in reporting and analytics

### 5. Future standardisation should also consider constraints and ownership

Naming improvement alone is not enough. When the schema is reviewed further, it is also useful to confirm:

- which table is the canonical source for each domain concept
- which tables are reference tables
- which tables are relation tables
- which tables are transitional or versioned

---

## Recommendations

### 1. Standardise naming around one clear convention

Use consistent lowercase `snake_case` with explicit word boundaries. This convention already exists partially and should be enforced more strictly across future schema changes.

### 2. Choose one plurality rule and apply it consistently

Domits should choose either singular or plural table names as the standard and apply that consistently across the schema. The most important point is not which option is selected, but that it is enforced consistently.

### 3. Normalise naming inside the property domain

The following tables should be reviewed first because they are the clearest examples of inconsistent compound naming:

- `property_generaldetail`
- `property_availabilityrestriction`
- `property_technicaldetails`

These names should be evaluated for more readable alternatives that match the broader naming convention used elsewhere.

### 4. Standardise reference-table versus property-table naming

Pairs such as the following should follow a common pattern:

- `general_details` and `property_generaldetail`
- `availability_restrictions` and `property_availabilityrestriction`
- `property_types` and `property_type`
- `rules` and `property_rule`

This does not necessarily require immediate renaming. It does require a clear naming rule for how Domits models reference tables and property-specific relation tables.

### 5. Review technical or provider-led names

The following tables should be reviewed for clarity and long-term maintainability:

- `user_table`
- `stripe_connectedaccounts`

They may be correct in operational use today, but their naming is less descriptive and less consistent than the rest of the schema.

### 6. Review overlap indicators before making structural decisions

The following table groups should be validated against current application usage:

- `property_image` and `property_image_v2`
- `property_type` and `property_types`
- `amenity_and_category` and `amenity_categories`

These pairs may indicate valid separation, transitional evolution, or overlap. They should be reviewed before any migration or cleanup proposal is formalised.

### 7. Document naming rules for future development

The schema should be supported by a short internal convention document that defines:

- singular or plural policy
- relation table naming rules
- reference table naming rules
- version suffix policy such as `_v2`
- naming expectations for external-provider tables

---

## Proposed Next Steps

1. Confirm the current Aurora `main` schema as the working source of truth for this research.
2. Validate which current tables are canonical, transitional, or reference-only.
3. Create a short naming convention for PostgreSQL tables used by Domits.
4. Review the highest-priority inconsistent names in the property domain first.
5. Validate overlap candidates such as `property_image` and `property_image_v2` against current application usage.
6. Review whether names such as `user_table` and `stripe_connectedaccounts` should be standardised in a future migration cycle.
7. Convert accepted recommendations into a phased migration plan that avoids breaking existing services.

---

## Conclusion

The earlier version of this research document was not sufficiently aligned with the actual current Aurora PostgreSQL structure because it relied partly on outdated table references. This revised version corrects that issue and is based on the current Aurora `main` schema.

The main conclusion is that the current schema is already far more structured than the earlier analysis suggested, especially in the areas of messaging, integrations, and property-related modeling. The remaining issues are mainly related to naming consistency, schema readability, and possible overlap between similarly named tables.

From a practical perspective, the most valuable next step is not aggressive cleanup, but controlled standardisation. Domits should first confirm current ownership and usage of the main tables, then apply a consistent naming strategy for future schema changes and carefully planned refactors.
