# Getting started with Domits
Domits is a React project with several dependencies. Follow these steps to set up and run the project on your local machine. 

## Prerequisites

Before you start, ensure you have [Node.js](https://nodejs.org/) installed on your machine.

## Installation

### Clone the Repository:

Open your terminal and run the following command to clone the develop branch of the Domits repository:

`git clone https://github.com/domits1/Domits.git`

## Pre Amplify Setup
Before you start the backend setup make sure you `delete` the `amplify` map in the Domits folder inside your code editor (VsCode/Intellij). After you have deleted this folder enter the web folder (through your code editor terminal): `cd web`. Inside your web folder there is also an amplify map you can `delete` this one too (just to be sure). 

## Amplify Setup
### Our backend is cloud-based and uses AWS Amplify. To get the backend up and running on your system, follow these instructions:

Install the Amplify CLI globally with the following command (In your code editor terminal inside web folder):
```npm install -g @aws-amplify/cli```

After installing the CLI, running `amplify -v` will return the version number. Use this to check if the install went well. Example of an output from a successful install: 12.10.1
Depending on whether you're working on the web app or the mobile app, navigate to the corresponding folder using **cd frontend\web**.

### Hint: Before running the upcoming command, ask for the login credentials to the Domits AWS account.

Ask for the login details to the Domits AWS account. Once you have the credentials, install the Amplify backend configuration using the following command: 

```amplify pull --appId d34jwd0sihmsus --envName develop```

If this fails, try removing the folders named amplify and rerun the command. If the command succeeded you will be directed to the AWS login page (or if already logged in, then you will most likely be directed into the confirm page).

After you have logged in to AWS, go back to your Code editor and you will be proceeded to the following steps:


    1. Choose your default editor: Select None.

    2. Choose the type of app that you're building: Javascript.
    
    3. What type of Javascript framework are you using: react
    
    4. Source directory path: src
    
    5. Distribution Directory Path: Leave this as it is(just click enter)
    
    6. Build Command: Leave this as it is. (just click enter)
    
    7. Start Command: Leave this as it is. (just click enter)
    
    8. Do you plan on modifying this backend: no

### Starting the application

Install Dependencies:
Run the following command to install the project dependencies:
`npm install`
This installs all the dependencies listed in the package.json file.

Run the Project
Now that you have cloned the repository and installed the dependencies, you can run the project using the following command (NOTE: this run is for windows users):
`npm start`
For Apple users: `FAST_REFRESH=false npm start`

This command starts the development server, and you can view the application in your web browser by navigating to http://localhost:3000.

## Additional Commands

### Build the Project:

npm run build


### Run Tests:
`npm test`

### Eject from Create React App:
`npm run eject`

## Development Environment
Node.js version: >=14.0.0* 
React version: ^18.2.0* 


------- needs to be added to the onboarding:
## ESLINT OR PRETTIER
- [ ] https://github.com/domits1/Domits/issues/1030

Code Linting
npm run lint

Once you've got an feature assigned from Stefan, check out the [featured API's](./3.%20featured%20API's.md)