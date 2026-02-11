* [Cypress](https://www.cypress.io/) e2e testing
* [Jest](https://jestjs.io/) Unit testing

# Introduction Jest

* [React testing guide](https://www.browserstack.com/guide/react-app-testing-with-jest)
* [Jest Docs](https://jestjs.io/docs/getting-started)
* [Testing In React Tutorial - Jest and React Testing Library](https://www.youtube.com/watch?v=JBSUgDxICg8)

### Step 1

Install the following packages (if they are not already installed):
- jest
- @testing-library/react
- @testing-library/jest-dom
- babel-jest
- babel-preset-react-app

### Step 2

Go to your component in the components map, and create a folder named __tests__ in the component folder. An example is already present in the components folder.

### Step 3

Write your Jest test in the __tests__ folder in your component. Every component needs to gets the test folder.

### Step 4

To run all Jest test, run the command npm test in the terminal. This runs all Jest test.

# Introduction Cypress

### Step 1

Download [Cypress](https://www.cypress.io/)

### Step 2

In your terminal use the following command:

`npm install cypress --save-dev`

### Step 3

When it's installed type the following command:

`npx cypress open`

This will open Cypress on a page in your browser. 

![Knipsel browser](https://github.com/mostpros1/repository/assets/39947787/d32c6a89-b8f5-48f4-90a4-2d5af3da855c)


### Step 4

When Cypress is opened select your browser and choose 'end-to-end' to create a testfolder.
![e to e](https://github.com/mostpros1/repository/assets/39947787/bc832611-3eca-4f5d-b1f8-d3c8248ebb78)

### step 5

Make a new file with the name `TestWebsite.cy.js` in Visual Studio Code in the folder cypress.

![cypress web](https://github.com/mostpros1/repository/assets/39947787/9c7ee26a-883f-43db-887c-c1e881a1ce10)

In this file we are gonna make a test with Cypress. In this test Cypress is gonna look for an input field on the Mostpros Amplify website with the code `cy.visit("https://main.d2j290dx5bs7ht.amplifyapp.com/")`. To check if there is an input field on the Amplify we use this code `cy.get('input').type('oh yes ')` and if there is an input field, Cypress will say 'oh yes'. 

```
describe('Testing searchbar functionality', () => {
    it('type in input', () => {
        cy.visit("https://main.d2j290dx5bs7ht.amplifyapp.com/")

        cy.get('input').type('oh yes ')

    })
})
```

![code](https://github.com/mostpros1/repository/assets/39947787/c375f85f-e374-4115-b7e6-ab5435ffa956)

### Step 6

Next you want to do is open Cypress and choose the file you want to test. In our case it will be `TestWebsite.cy.js`.

![Knipsel Testweb](https://github.com/mostpros1/repository/assets/39947787/a165de99-beef-4727-b753-57c34e8a069b)

After the test has ran you will see that Cypress has found the Amplify website and that it contains an input field with the words 'oh yes'.

![Knipsel resultaat](https://github.com/mostpros1/repository/assets/39947787/d745e289-57b7-42aa-9acf-dccd98bfd5ef)

Now you know how to work with Cypress and you've already finished your first test! To expand your tests you can firstly write down your test goals with paper and pencil and test this with Cypress. Write your test results on the paper. After this you can setup your own checklist for future tests. An example of this below!

![Testing-checklist 1x](https://github.com/mostpros1/repository/assets/39947787/eee61569-a27f-460d-b7b5-4f15dd8c36b3)

Now you are all set to learn more and more about Cypress. Make sure to read the articles on [this page](https://github.com/mostpros1/repository/wiki/Testing-resources)

# Running Cypress Tests after your done with your task
Once you have set up a task/Cypress test, you can execute your end-to-end tests with a single command in your code editor terminal.

## 1. Run All Cypress Tests
To run all tests in headless mode, use the following command:

`npx cypress run`

## 2. Run a Specific Test File
If you want to run a specific test file, you can specify the file path using the --spec option. replace TestName with your file name that you created.

`npx cypress run --spec "cypress/e2e/TestName.cy.js"`

Good luck! =)


Next step [Automated testing](https://github.com/domits1/Domits/wiki/cypress-automated-testing)

