todo:
- [ ] Add explanation about microservices, and that AWS lambda is a microservice
- [ ] Service overview about every function that Domits uses

# Domits AWS Overview

To get a basic understanding of every AWS service, ensure you have followed this course: [AWS Cloud Practitioner Essentials](https://skillbuilder.aws/search?searchText=aws-cloud-practitioner-essentials&showRedirectNotFoundBanner=true)

This document serves the purpose of documenting all of our (current) used services from AWS. If Domits uses a new service, feel free to add this in here.

## Current (most) used AWS Services

### Amplify

Amazon Amplify is what we use to build and deploy the Domits Websites (Acceptance and Main.) This is a easy scalable service.
This features real-time APIs which are backed by AWS, Auth such as a bearer token, storage, functions, extensibility and mobile support. This is what really makes Domits a **Full-Stack** application.

Currently, our CI/CD pipeline is setup in a way that after every PR that is merged to acceptance/main, it gets through Amplify. If you ever suspect something going wrong, your best bet is to check Amplify and see if the build has passed or not. If the build has failed, and you don't know what to do, contact a senior dev, or someone else from the team. However, if you feel brave enough, try googling and fixing it yourself. Usually a build can go wrong because of the website not compiling. This can range from a simple syntax error or missing export (usually accidently done by developers) to larger scaled problems. Do not worry too much if a build fails though.

### Lambda

AWS Lambda is a microservice. It allows us to write serverless code. Currently, Lambda is being used for CRUD operations of the property, booking and more to come. You can write Lambda code in any preferred language, but our standard is Node.JS. If you wish to develop a Lambda in another language, please ask a senior dev about this. Lambda also slots right in with API Gateway. Those two are what you can use, to create a beautiful API, speaking of...

### API Gateway

Amazon API Gateway allows you to make RESTful APIs (HTTP/REST), WEBSOCKET APIs and offers efficient API development, with performance scaling in mind. It allows easy monitoring through Amazon Cloudwatch.
Amazon API Gateway is what we use to connect our Lambda functions to the internet, and turning them into fancy endpoints which we can connect from the frontend to for sending API requests. Those can range from simple GET requests to massive CREATE operations, where e.g. you're creating a property on Domits.

### S3

Amazon S3 is Amazon's cloud storage solution. Referred to as Amazon Simple Strorage Service. S3 stores data within buckets. A bucket is a container for objects. We currently use S3 for accommodation images.

### Aurora DSQL

Amazon DSQL is fast serverless SQL database using PostgreSQL: a open-source relational database management system.
It offers multi-Region reads and writes, and allows effortless scaling and zero downtime maintenance. There is no infrastructure to manage when we use DSQL for the database and its easy to use.

### Cognito

AWS Cognito is a managed service that provides uer authenticaiton, authorization and access control for web/mobile applications. We use this service for handling logging in on Domits. We store user account data on Cognito as well in the user pool.

### Systems Manager

AWS Systems manager helps up managing infrastructure on AWS. We use its Secrets Manager to store important secrets such as Stripe Secret Keys.

### IAM

AWS Identity and Access Management
### Cloudwatch

### CloudShell

### CloudTrail

### Route 53

WHAT WE USE:
Cloudwatch
Dynamodb..? still getting paid for
Amplify
WAF
GuardDuty
Security Hub
Key Management Service
Config
Secrets Manager
Lambda
S3
Route 53
API Gateway
Cloudwatch Events
CloudTrail
AppSync?
Cloudshell??
Cognito.?

## Previous used AWS Services

## Service overview for every microservice.

### DynamoDB

## Microservices