# Database Main #138 – Research Document  
## Naming, Structure & Security

**Related issue:** #1420  
**Author:** Ameen Abdelrahman  

---

## 1. Introduction

Domits has recently migrated from AWS DynamoDB (NoSQL) to AWS Aurora (PostgreSQL). This transition introduces relational database capabilities such as structured schemas, constraints, and improved data integrity.

However, the current database still contains legacy artifacts from the previous NoSQL setup, including inconsistent naming, duplicate tables, and unclear structure.

This research document analyses the current state of the database and proposes improvements in terms of naming conventions, structure, and security.

---

## 2. Research Objective

The objective of this research is:

> To design a consistent and maintainable database structure for Aurora PostgreSQL by analysing the current database and proposing improvements in naming, structure, and security.

---

## 3. Research Questions

### Main Question
How can the current Domits database be restructured to improve consistency, maintainability, and security after migrating from DynamoDB to PostgreSQL?

### Sub-questions
1. What inconsistencies exist in the current database naming?
2. Which tables are duplicate or legacy?
3. How can the database structure be improved using relational principles?
4. How can complex domains (e.g. messaging) be simplified?
5. What security improvements are required for the current database?

---

## 4. Research Methodology

This research is conducted using the following methods (based on ICT research practices):

### 4.1 System Analysis
- Reviewing existing database tables
- Identifying naming patterns and inconsistencies
- Detecting duplicate and legacy tables

### 4.2 Comparative Analysis
- Comparing current structure with PostgreSQL best practices
- Evaluating differences between NoSQL and relational approaches

### 4.3 Best Practice Research
- Applying standard PostgreSQL conventions:
  - snake_case naming
  - relational integrity (foreign keys)
  - normalized structures

### 4.4 Design-Oriented Research
- Proposing a new structured model
- Defining naming conventions
- Suggesting improvements for security and maintainability

---

## 5. Findings

### 5.1 Inconsistent Naming

Different naming styles are used:
- kebab-case (`Booking-production`)
- PascalCase (`UsersVerification`)
- mixed formats (`Chat-<id>-production`)

**Impact:**
- Reduces readability
- Makes queries and maintenance harder
- Not aligned with PostgreSQL standards

---

### 5.2 Environment in Table Names

Examples:
- `*-production`
- `*-develop`

**Impact:**
- Environment separation is incorrectly handled at table level
- Should be managed via infrastructure or schemas
- Causes duplication and confusion

---

### 5.3 Duplicate Tables

Examples:
- `Booking` vs `Booking-production`
- `Review` vs `Review-production`
- multiple chat-related tables

**Impact:**
- Unclear source of truth
- Risk of inconsistent or outdated data
- Increased maintenance complexity

---

### 5.4 Legacy Tables (DynamoDB / Amplify)

Examples:
- `AmplifyDataStore-*`
- `Todo-*`

**Impact:**
- Likely unused
- Pollutes the database
- Increases cognitive load for developers

---

### 5.5 Overly Complex Messaging Structure

Multiple overlapping tables:
- `Chats`
- `ChatBotMessages`
- `eChatMessages`
- `ContactList`
- `eChatSessions`

**Impact:**
- Hard to understand relationships
- Difficult to maintain
- Overengineering for current needs

---

## 6. Design Principles

Based on the findings, the following principles are defined:

1. **Consistency** – All tables follow the same naming convention  
2. **Simplicity** – Avoid unnecessary complexity  
3. **Clarity** – Table purpose must be immediately clear  
4. **Relational Integrity** – Use foreign keys and constraints  
5. **Separation of Concerns** – Sensitive data properly isolated  

---

## 7. Proposed Naming Convention

The following PostgreSQL standard is proposed:

- lowercase only  
- snake_case  
- plural table names (consistent usage)  
- no environment indicators  
- no random suffixes or IDs  

### Example Transformations

| Current | Proposed |
|--------|---------|
| Booking-production | bookings |
| Review-production | reviews |
| Calendar-production | availability_calendars |
| Calender | availability_calendars |
| Chat-* | conversations |
| eChatMessages | messages |

---

## 8. Proposed Structural Improvements

### 8.1 Table Standardization

Each table should include:
- `id` (UUID, primary key)
- `created_at`
- `updated_at`
- optional: `deleted_at`

---

### 8.2 Relational Design

- Use foreign keys to define relationships
- Example:
  - `bookings.user_id → users.id`
  - `messages.conversation_id → conversations.id`

---

### 8.3 Indexing

- Add indexes on:
  - foreign keys
  - frequently queried fields

---

## 9. Messaging Simplification (Key Improvement)

### Current Situation
Messaging is distributed across many unrelated tables.

### Proposed Model

- `conversations`
- `messages`
- `conversation_participants`
- `notifications`

### Justification
- Reduces complexity
- Improves maintainability
- Provides a clear relational structure
- Easier to scale and extend

---

## 10. Security Considerations

### 10.1 Sensitive Data Separation
Separate tables for:
- verification codes
- payment data
- tokens

---

### 10.2 Access Control
- Apply least privilege principle
- Limit service access to required tables only

---

### 10.3 Data Integrity
- NOT NULL constraints
- UNIQUE constraints where applicable
- Enforce referential integrity

---

## 11. Proposed Table Actions

| Table | Action | Reason |
|------|--------|--------|
| Booking | remove/merge | duplicate |
| Booking-production | keep (rename) | main table |
| Review | remove/merge | duplicate |
| Review-production | keep (rename) | main table |
| Calendar-production | rename | naming improvement |
| Calender | remove | typo |
| Chats / Chat-* | merge | simplify messaging |
| eChatMessages | merge | simplify messaging |
| Payments | remove | duplicate |
| Payments-production | keep (rename) | main table |
| AmplifyDataStore-* | remove | legacy |
| Todo-* | evaluate | unclear usage |

---

## 12. Conclusion

The current database structure contains several inconsistencies and legacy artifacts due to the transition from DynamoDB to PostgreSQL.

The main issues are:
- inconsistent naming
- duplicate tables
- unnecessary complexity
- lack of relational structure

By applying standardized naming, simplifying structures, and improving security, the database can become significantly more maintainable and scalable.

---

## 13. Next Steps

1. Validate which tables are actively used  
2. Review and approve this proposal  
3. Create a migration plan  
4. Execute database cleanup and restructuring  
5. Apply constraints and relationships  

---

## 14. Reflection

This research highlights the importance of aligning database design with the chosen database paradigm. Moving from NoSQL to a relational database requires not only technical migration, but also structural and conceptual adjustments.

Applying consistent conventions and simplifying design improves long-term maintainability and reduces system complexity.