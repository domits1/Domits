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

## Previous DynamoDB Context

Previously we used DynamoDB:

* DynamoDB: https://aws.amazon.com/dynamodb/
* DynamoDB schema design: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
* Amazon DynamoDB Deep Dive: https://www.youtube.com/watch?v=HaEPXoXVf2k
* How to model: https://medium.com/@ratulsaha/how-to-model-amazon-dynamodb-databases-with-nosql-workbench-bdb1bdbb6fcc
* [Current/ Old Database tables naming & structure](https://github.com/domits1/Domits/issues/1420)
* [Database main issue](https://github.com/domits1/Domits/issues/138)