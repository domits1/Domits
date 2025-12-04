# Domits AWS Overview

To get a basic understanding of every AWS service, ensure you have followed this course: [AWS Cloud Practitioner Essentials](https://skillbuilder.aws/search?searchText=aws-cloud-practitioner-essentials&showRedirectNotFoundBanner=true)

This document serves the purpose of documenting all of our (current) used services from AWS. If Domits uses a new service, feel free to add this in here.

- [Domits AWS Overview](#domits-aws-overview)
  - [What is a microservice?](#what-is-a-microservice)
  - [Current (most) used AWS Services](#current-most-used-aws-services)
    - [Amplify](#amplify)
    - [Lambda](#lambda)
    - [API Gateway](#api-gateway)
    - [S3](#s3)
    - [Aurora DSQL](#aurora-dsql)
    - [Cognito](#cognito)
    - [Systems Manager](#systems-manager)
    - [IAM](#iam)
    - [Cloudwatch](#cloudwatch)
    - [CloudShell](#cloudshell)
    - [Route 53](#route-53)
  - [Previous used AWS Services](#previous-used-aws-services)
    - [DynamoDB](#dynamodb)
  - [Test your knowledge!](#test-your-knowledge)
    - [Knowledge questions](#knowledge-questions)


## What is a microservice?

Before starting to get to know every AWS service, it is essential what a microservice is, as it is part of the biggest service we use, yet many (including Raman(skill issue)) didn't know what it means. 
A **microservice architecture** is a [**Architectural pattern**](https://en.wikipedia.org/wiki/Architectural_pattern) that organises a application into a collection of loosely coupled services that communicate through **lightweight protocols**. This pattern provides the ability to **develop** and **deploy** **services** **independently**, improving modularity, scalability and adaptability. [source: Wikipedia](https://en.wikipedia.org/wiki/Microservices)

[AWS Lambda](https://aws.amazon.com/lambda/) is a microservice.

## Current (most) used AWS Services

### Amplify

Amazon Amplify is what we use to build and deploy the Domits Websites (Acceptance and Main.) This is a easy scalable service.
This features real-time APIs which are backed by AWS, Auth such as a bearer token, storage, functions, extensibility and mobile support. This is what really makes Domits a **Full-Stack** application.

Currently, our CI/CD pipeline is setup in a way that after every PR that is merged to acceptance/main, it gets through Amplify. If you ever suspect something going wrong, your best bet is to check Amplify and see if the build has passed or not. If the build has failed, and you don't know what to do, contact a senior dev, or someone else from the team. However, if you feel brave enough, try googling and fixing it yourself. Usually a build can go wrong because of the website not compiling. This can range from a simple syntax error or missing export (usually accidently done by developers) to larger scaled problems. Do not worry too much if a build fails though.

### Lambda

AWS Lambda is a microservice. It allows us to write serverless code. Currently, Lambda is being used for CRUD operations of the property, booking and more to come. You can write Lambda code in any preferred language, but our standard is Node.JS. If you wish to develop a Lambda in another language, please ask a senior dev about this. Lambda also slots right in with API Gateway. Those two are what you can use, to create a beautiful API, speaking of API's, its a great time to introduce API Gateway next.

### API Gateway

Amazon API Gateway allows you to make RESTful APIs (HTTP/REST), WEBSOCKET APIs and offers efficient API development, with performance scaling in mind. It allows easy monitoring through Amazon Cloudwatch.
Amazon API Gateway is what we use to connect our Lambda functions to the internet, and turning them into fancy endpoints which we can connect from the frontend to for sending API requests. Those can range from simple GET requests to massive CREATE operations, where e.g. you're creating a property on Domits.

### S3

Amazon S3 is Amazon's cloud storage solution. Referred to as Amazon Simple Strorage Service. S3 stores data within buckets. A bucket is a container for objects. We currently use S3 for accommodation images.

### Aurora DSQL

Amazon DSQL is fast serverless SQL database using PostgreSQL: a open-source relational database management system.
It offers multi-Region reads and writes, and allows effortless scaling and zero downtime maintenance. There is no infrastructure to manage when we use DSQL for the database and its easy to use. We use DSQL as main database for saving bookings, properties, payments etc etc.

### Cognito

AWS Cognito is a managed service that provides uer authenticaiton, authorization and access control for web/mobile applications. We use this service for handling logging in on Domits. We store user account data on Cognito as well in the user pool.

### Systems Manager

AWS Systems manager helps up managing infrastructure on AWS. We use its Secrets Manager to store important secrets such as Stripe Secret Keys.

### IAM

AWS Identity and Access Management (AWS IAM) is a web service for securely controlling access to your AWS account. It provides the right tools to manage users, security credentials and permissions, so the admin can define which user/role can access what AWS service/resource and under what conditions. The core components are: Users, user groups, roles and policies which work together control autentication and authorization. 

Fun fact: Even a AWS Lambda function requires permissions managed through IAM to communicate with the Database, that is how strictly policies in AWS are and how AWS operates with different permissions.

Another fun fact: If you ever get a error in your AWS Function referred to `is not authorized to perform: lambda:InvokeFunction on resource: arn:aws:lambda:us-east-1:...-authEmailTrigger` or something, you can always ensure that the problem is authorization, by fishing that word out the error! This saves you debugging time!

### Cloudwatch

Amazon Cloudwatch is amazon's service to allow you to monitor and optimize your entire technology stack with CloudWatch in rreal-time. You can troubleshoot issues efficiently using AWS operational expertise and scalability built into Cloudwatch. A use case scenario when cloudwatch is used, is to debug a AWS Lambda function which gives a 500 status code, and nothing else. CloudWatch always gives the full detailed explanation. It also allows setting up alarms, and analyzing performance metrics of AWS resources.

### CloudShell

AWS CloudShell is a terminal to allow you to explore and manage AWS resources in your browser. Although, the recommendation for accessing the AWS terminal, is to install the AWS CLI, and use your own terminal of choice. Don't know how to do that? Check [this guide](../onboarding/backend_setup.md) and scroll down to **Prerequisites**.

### Route 53

Amazon Route 53 is a DNS Service, if you don't know what a DNS service is, check [this video](https://www.youtube.com/watch?v=UVR9lhUGAyU). Route 53 ensures reliable and efficient routing of end users by leveraging globally-dispersed Domain Name System (DNS) servers.



## Previous used AWS Services


### DynamoDB

**DynamoDB is no longer used. Old code can still refer to DynamoDB Calls, however, those need to be refactored. Refer to [DSQl Transitioning Docs.](./../tools/dsql_transitioning_docs.md)**

## Test your knowledge!
Here are some questions to test your knowledge! Try to write down the answers on something, or answer them in your head! To view the answer, click the arrow!

For every correct answer, you can give yourself one point!

### Knowledge questions

<details><summary>1. What AWS microservice do we currently use the most?</summary>AWS Lambda</details>
<details><summary>2. What AWS service connects Lambda functions to the internet?</summary>API Gateway</details>
<details><summary>3. What storage service do we use for accommodation images?</summary>S3</details>
<details><summary>4. What service stores user accounts for Domits?</summary>Cognito User Pools</details>
<details><summary>5. What AWS service monitors logs and helps debug Lambda errors?</summary>CloudWatch</details>
<details><summary>6. What service manages secrets such as Stripe keys?</summary>Systems Manager → Secrets Manager</details>
<details><summary>7. What service hosts the Domits websites?</summary>Amplify</details>
<details><summary>8. What database engine replaced DynamoDB in Domits?</summary>Aurora DSQL (PostgreSQL-compatible)</details>
<details><summary>9. What service controls access to AWS resources?</summary>IAM</details>
<details><summary>10. What AWS feature allows multi-region continuous reads/writes with zero downtime?</summary>Aurora DSQL</details>


Based on your points, that would be your grade! 