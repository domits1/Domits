# The Backend Setup (AWS Lambda)

## Overview

**AWS Architecture for Domits V2:**

![Screenshot 2024-10-01 at 14 11 21](https://github.com/user-attachments/assets/9c9bc39d-46d9-4daa-9d5d-0faa7926b3cb)

Lamba functions are a vital part of our infrastructure within Domits. It allows us to write code without thinking of servers, serverless code.

That is why Domits makes use of AWS Lambda. Previously, we used to deploy code within our browser on the AWS Console. This has changed, to ensure quality control, avoid breaking production code, by writing and testing Lambda code in your IDE. 

In this doc you will be walked through the process of:

## Table of contents

<!--ts-->
   * [Prerequisites](#prerequisites) - Pre-setup before continuing.
   * [Create a Lambda Function](#create-a-lambda-function) - How to deploy a new function or connect a existing one.
     * [Create a new Lambda Function](#create-a-new-lambda-function) - With a NPM package + template
     * [Add/Migrate a existing Lambda Function](#addmigrate-a-existing-lambda-function) - Using a already existing function from AWS Console.
   * [Coding your Function](#coding-your-function) - Best way to understand the structure and code your function.
   * [Running your Function](#running-your-function) - Using Node.js to run your function
   * [Writing Tests for your function](#writing-tests-for-your-function) - Using Jest's framework to test your functions and guarantee stability in your code.
   * [Tips to use while programming](#tips-to-use-while-programming) - General tips from the contributors of this doc.
<!--te-->


# Prerequisites
Before continuing, ensure your machine has done those steps. If not, what are you waiting for?

1. Run `npm install` in /backend
2. Install AWS CLI (v2 preferred, but not needed)
      1. Windows: `winget install Amazon.AWSCLI` (Windows 10 version 1809 (build 17763) or later, otherwise [manually install](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)).
      2. Mac/Linux: `brew install awscli` (Ensure [brew](https://brew.sh/) is installed)
      3. Restart your current terminal instance after successful installation
      4.  Run `aws --version` to verify your installation, it should say something similiar like `aws-cli/2.29.0 Python/3.13.7 Windows/11 exe/AMD64`
   
3.  Preconfigure AWS with your credentials
      1.  Log in the [AWS Console](https://eu-north-1.console.aws.amazon.com/console/home?region=eu-north-1), and press the right corner of the page to click on your own name.
      2.  A menu will pop out, and the last option mentions **Security credentials**. Click it.
      3.  You will be redirected to the IAM page. In the tab AWS IAM credentials, scroll down to **Access Keys** and click **Create access key**.
      4.  At Step 1, tick **Command Line Interface (CLI)** as use case, and click tick the confirmation.
      5.  At Step 2, give your access key a identifier, for example `ramanlaptopHPFirefly`
      6.  Keep Step 3 open. Now open your Terminal

4. In the awscli terminal, enter `aws configure`. Fill in the following:
```bash
AWS Access Key ID [Enter the Access Key from Step 3 on your browser]:
AWS Secret Access Key [Enter the Secret Key from Step 3 on your browser]:
Default region name [eu-north-1]:
Default output format [json]:
```
1. Verify that your configuration is working and run `aws s3 ls`, this should list S3 buckets. If you don't understand it, don't worry. As long as it lists items such as *accommodation*, you configured awscli successfully.
> [!NOTE]  
> If for some reason, your AWS Console tells you that you lack insufficient permissions to create a Access Key, make sure to contact the IAM Admin or send a message in channel 4.

Congrats! This part is finished! There is a additional checklist for you to follow to ensure a successful setup. Not mandatory, but just for verification for yourself.

---

## ✅ Prerequisites Checklist

Before you continue, confirm you’ve completed **all** of these steps:

* [ ] Ran `npm install` inside `/backend`
* [ ] Installed AWS CLI (v2 or higher)
  * [ ] Verified with `aws --version`
* [ ] Restarted the terminal after installing AWS CLI
* [ ] Logged in to the [AWS Console](https://eu-north-1.console.aws.amazon.com/console/home?region=eu-north-1)
* [ ] Navigated to **Security Credentials** from your profile menu
* [ ] Created a new **Access Key** for CLI usage
  * [ ] Saved both **Access Key ID** and **Secret Access Key** safely
* [ ] Ran `aws configure` and filled in:
  * [ ] AWS Access Key ID
  * [ ] AWS Secret Access Key
  * [ ] Default region `eu-north-1`
  * [ ] Default output format `json`
* [ ] Confirmed configuration works by running:

  ```bash
  aws s3 ls
  ```

  *(Should return a list of S3 buckets.)*

---

# Create a Lambda Function

Let's create a Lambda function. There are two options, we can make a new one, or use a exisitng one to migrate into the IDE.

## Create a new Lambda Function
If you want to make your own Lambda function, you can do so by following these steps.

1. In your Terminal (IDE or terminal app), navigate to the root folder of your project, and `cd backend`.
2. Run `npm run createLambda`.
3. On `What will your lambda function be called?`, think about a good name and enter it. 
4. It's done! Make sure to familarize yourself with the structure in docs\tools\backend_development_flow.md before starting to code.

## Add/Migrate a existing Lambda Function
It is important that you know the exact name of the lambda function you'd wish to add.
For this example, I'll use the CreateStripeCheckout function as a lambda function. This one does not exist in the IDE (yet?). Anyway. We got the entire name. What now?

1. In your Terminal (IDE or terminal app), navigate to the root folder of your project, and `cd backend`.
2. Run `npm run createLambda false`.
3. On `What will your lambda function be called?`, enter the **EXACT** name of the function. 
4. It's done! Make sure to familarize yourself with the structure in docs\workflows\backend_development_flow.md before starting to code.

# Coding your Function
If you just made your lambda or imported one, you will notice that there is a template. This template assures that every developer follows this template, and all backend code will be neat and understandable for everyone. If you understand the template, you can easier understand all other functions written like this.
There is a well explained file: docs\workflows\backend_development_flow.md, this one explains everything about the backend development flow well. However, this will serve here as a quick summary with bulletpoints.

### Why follow the workflow?

* Ensures all developers follow the same structure and template.
* Makes code predictable and easier to understand for every developer.
* Enables automatic testing and deployment pipelines.
* Guarantees version control and consistent code quality.

### Backend Directory Structure

* **CD:** Only for senior devs/DevOps. Creates templates and manages deployments.
* **Events:** Test your functionality end-to-end.
* **Functions:** Write the actual backend code to deploy on AWS.
* **Test:** Write unit, integration, and end-to-end tests with Jest.

### Layers

* **Controller:** Receives requests, parses input, handles authorization, sends data to business layer.
* **Business:** Validates data, confirms consistency.
* **Data:** Communicates with databases/APIs, returns to the Business layer
* **Util:** Functions that don’t fit elsewhere (mapping, parsing, custom exceptions, headers).

### Controller Layer

* Parse request body & inputs.
* Authorize user requests.
* Send needed data to business layer.

### Business Layer

* Validate all input data.
* Confirm entity existence in DB before operations.
* Aggregate and orchestrate multiple data calls if needed.

### Data Layer

* Fetch and return data from APIs/DBs.
* Map data to readable objects before sending to business layer.

### Util Directory

* Mapping functions (e.g., `{ "id": { "S": "123" } } → { "id": "123" }`)
* Custom exceptions & HTTP headers
* Any helper functions not fitting business/data layers

# Running your Function
If you made your Lambda Function, a template will be used for you. You can already try to run the code! How? Pretty simple.
1. Navigate to the /backend directory in your terminal.
2. cd into the /events folder
3. use `ls` or `dir` to show all files in the directory. The Lambda function you want to work on will be listed here.
4. cd into the function
5. Open the ./get.js file on your code editor. Why? We need to fix the import.

The import will be called `import {handler} from "../function/index.js";`
However, this import has a invalid location and will strike a [ERR_MODULE_NOT_FOUND] error once you'll run your function. So, give it a right location. Verify it by pressing CTRL+Click (mac users = CMD+CLICK) on the location and the index.js should open.

6. Now that the import is fixed, you can run `node ./get.js` and your function will run!

> [!TIP]  
> Now is a good idea to know how HTTP Status codes work. These are vital for your function to communicate as a API towards the frontend. [MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) documents this very well.

# Writing Tests for your function
When your function is made, it will automatically create a folder in /backend/test. Here, a template test is created.

There are different types of way to test a code. To dive into the most used ones:

* End-To-End Testing - Tests the entire flow from request to response.
* Unit Tests - Tests individual functions or modules in isolation.
* Intregration Tests - Tests how multiple parts work together (Invoke lambda, write to S3, verify existance.)

Those are the most used ones. There are way more, but I believe that this is sufficient enough.

To write tests, I recommend taking a look at [Jest's Documentation](https://jestjs.io/docs/api) and take the current examples of existing functions
(Property-Handler, General-Bookings-CRUD-Bookings-develop).

# Tips to use while programming

* **Keep every function aimed to do 1 thing.**
  * Every function should aim to do one thing. If you'd make a function which would put data in the database, don't make it verify data too. Only aim to keep it to do one thing. And if it does more then 1 thing, make another function.
* **Name like a human would understand**
  * Clear names > clever names. Use meaningful function and variable names that explain what they do.
* **Write small and modular code**
  * Break large logic into smaller, reusable modules. This makes it easier to debug, understand, and scale your code later.
* **Refactor often**
  * Clean as you go. Remove unused variables, comments, and code that doesn’t serve a purpose anymore.
* **Test early and often**
  * Write small tests for small pieces. This prevents bugs from snowballing into disasters later on.
* **Comment why, not what**
  * Use comments to explain decisions, not actions. Code already shows what it does, comment why it does it.
* **Don't prematurely optimize**
  * Make it work first, then make it fast. Focus on correctness before performance.
* **Handle errors gracefully**
  * Expect failure and prepare for it. Use try/catch blocks or error handling logic to recover without chaos.
* **Make commits for major (working) changes**
  * You'll thank yourself when something breaks. Rollbacks are lifesavers, you can make as much commits as you want, so never make too less.
* **Keep a consistent style**
  * Follow a coding style guide. Indentation, naming, spacing etc, consistency keeps your codebase readable for everyone (including future-you).
