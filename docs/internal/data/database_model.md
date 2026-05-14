# Domits Database Model

## Aurora DSQL

* Aurora DSQL (PostgreSQL): https://github.com/domits1/Domits/wiki/Aurora-DSQL-Transitioning-Docs

## Entity Relationship Diagram

* Up-to-date Aurora DSQL ERD: https://lucid.app/lucidchart/f68b11d7-8ea1-42eb-80a3-2a76a1da2492/edit?invitationId=inv_1c6d44ed-fb13-413b-b392-625a493c157f&page=5ffXNMpdfGRz#
* Repository ERD reference: `docs/internal/data/database-erd.md`

The ERD has been updated and split into three readable Lucidchart sections:

1. Core Property ERD
2. Messaging & Integrations ERD
3. Operations, Analytics & Standalone Site ERD

This updated ERD includes the original property, booking, payment, amenities, rules, pricing, and availability model, plus newer Domits data areas such as image v2, calendar overrides, iCal sources, cancellation policies, unified messaging, channel integrations, sync state/logs, property tasks, KPI snapshots, and standalone site tables.

## Database Foundation Topics

### Database Management System

Domits uses Aurora DSQL with PostgreSQL-compatible SQL as the operational relational database direction. Aurora DSQL is used for canonical operational data such as users, properties, bookings, payments, availability, messaging, integrations, and related platform records.

### Normalization & Schema Design

The Domits database model uses relational tables to reduce redundant data and keep core business entities consistent. Reference tables are used for reusable values such as amenities, rules, property types, availability restrictions, and other controlled lists. Join tables are used for many-to-many relationships such as properties to amenities and properties to rules.

Raw or source-specific integration data should remain separate from canonical operational records when traceability or replay is required.

### Indexing & Performance

Indexes should support known access patterns such as:

- Property lookup by host, status, location, and type.
- Booking lookup by property, guest, host, status, and stay dates.
- Availability and pricing lookup by property and date.
- Messaging lookup by thread, booking, participant, and sent timestamp.
- Integration lookup by provider, external ID, property mapping, and sync status.

Indexes should be added based on real query needs and reviewed to avoid unnecessary write overhead.

### Transactions & Consistency

Transactions should be used when multiple writes form one business operation. Important examples include booking creation, booking cancellation, payment confirmation, payout processing, messaging thread creation, and property publishing.

Webhook and partner event processing should be idempotent so repeated events do not create duplicate business effects.

### Data Access & Integration

Application services should access Aurora DSQL through the shared TypeORM-based database layer where possible.

Related documentation:

- `docs/internal/tools/orm/usage.md`
- `docs/internal/tools/orm/our_implementation.md`
- `docs/internal/tools/orm/typeorm.md`

The data access layer maps database tables to application objects and supports repository, DAL, API, and ETL / ELT usage patterns.

### Analytics & Warehousing

Aurora DSQL should primarily support OLTP operational workloads. Heavy reporting, historical aggregation, BI, machine learning features, and GenAI datasets should use derived analytical layers such as warehouse, lake, fact table, dimension table, star schema, or snowflake schema patterns where needed.

The wider analytics approach is described in `docs/internal/data/data-foundation.md`.

### Data Governance & Quality

The database model should support quality through primary keys, foreign keys, unique constraints, required fields, validation, reference tables, source mapping, and documented ownership for important data domains.

Important governance concepts include integrity, validation, lineage, cataloging, master data, and reference data.

### Security & Compliance

Database access should follow least privilege and protect sensitive data such as identity, booking, payment, payout, authentication, and message data. Required controls include access control, encryption, auditing, secret management, and data retention rules.

### Operational

Operational database practices should include backup, restore testing, replication planning, controlled migrations, and safe handling of large tables. Partitioning may be useful for large time-based data such as messages, events, sync logs, transactions, audit logs, calendar prices, and analytics snapshots.

Sharding should only be considered after proven scale pressure and after indexing, query optimization, read separation, and analytical offloading have been evaluated.

### Modern & Advanced Data Terms

Relevant modern data architecture concepts for Domits include:

- Event Sourcing
- CQRS
- Data Mesh
- Stream Processing
- Change Data Capture
- Idempotency
- Lineage
- Canonical data model
- Raw data layer
- Derived datasets

## Previous DynamoDB Context

Previously we used DynamoDB:

* DynamoDB: https://aws.amazon.com/dynamodb/
* DynamoDB schema design: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
* Amazon DynamoDB Deep Dive: https://www.youtube.com/watch?v=HaEPXoXVf2k
* How to model: https://medium.com/@ratulsaha/how-to-model-amazon-dynamodb-databases-with-nosql-workbench-bdb1bdbb6fcc
* [Current/ Old Database tables naming & structure](https://github.com/domits1/Domits/issues/1420)
* [Database main issue](https://github.com/domits1/Domits/issues/138)