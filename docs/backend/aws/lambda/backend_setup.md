# The Backend Setup (AWS Lambda)

## Overview

**AWS Architecture for Domits V2:**
![Screenshot 2024-10-01 at 14 11 21](https://github.com/user-attachments/assets/9c9bc39d-46d9-4daa-9d5d-0faa7926b3cb)

Lamba functions are a vital part of our infrastructure within Domits. It allows us to write code without thinking of servers, aka: Serverless code.

That is why Domits makes use of AWS Lambda. Previously, we used to deploy code within our browser on the AWS Console. This has changed, to ensure quality control, avoid breaking production code, by writing and testing Lambda code in your IDE. In this doc you will be walked through the process of:

## Table of contents

<!--ts-->
   * [Prerequisites](#Prerequisites) - Pre-setup before continuing.
   * [Create a Lambda Function](#1) - How to deploy a new function or connect a existing one.
     * [Create a new Lambda Function](#1) - With a NPM package + template
     * [Add/Migrate a existing Lambda Function](#1) - Using a already existing function from AWS Console.
   * [Testing your Function](#1) - Using Node.js to run your function
   * [Writing Tests for your function](#1) - Using Jest's framework to test your functions and guarantee stability in your code.
   * [Tips to use while programming](#1) - General tips from the contributors of this doc.
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
```PS
AWS Access Key ID [Enter the Access Key from Step 3 on your browser]:
AWS Secret Access Key [Enter the Secret Key from Step 3 on your browser]:
Default region name [eu-north-1]:
Default output format [json]:
```
1. Verify that your configuration is working and run `aws s3 ls`, this should list S3 buckets. If you don't understand it, don't worry. As long as it lists items such as *accommodation*, you configured awscli successfully.
> [!NOTE]  
> If for some reason, your AWS Console tells you that you lack insufficient permissions to create a Access Key, make sure to contact the IAM Admin or send a message in channel 4.
> 
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

## Create a Lambda Function

Let's create a Lambda function. There are two options, we can make a new one, or use a exisitng one to migrate into the IDE.

### Add/Migrate a existing Lambda Function
It is important that you know the exact name of the lambda function you'd wish to add.
For this example, I'll use the CreateStripeCheckout function as a lambda function. This one does not exist in the IDE (yet?). Anyway. We got the entire name. What now?

1. In your Terminal (IDE or terminal app), navigate to the root folder of your project, and `cd backend`.
2. Run `npm run createLambda false`.
3. On `What will your lambda function be called?`, enter the **EXACT** name of the function. 
   