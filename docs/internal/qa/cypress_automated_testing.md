### Introduction
This guide outlines the setup and execution of automated tests for an authentication script using GitHub Actions. The tests cover various authentication scenarios such as login, registration, etc.

### Folder Structure
Ensure your repository has the following structure:

- root/
  - .github/
    - workflows/
      - ci.yml
The GitHub Actions workflow is defined in the ci.yml file.

### GitHub Actions Workflow Script
Create a file named ci.yml with the following content:

```
name: Authentication Tests

on:
  push:
    branches:
      - 'develop'

jobs:
  authentication-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Install Dependencies
        run: |
          npm ci --verbose

      - name: Install Cypress
        uses: cypress-io/github-action@v6
        with:
          runTests: false

      - name: Run Cypress Tests
        uses: cypress-io/github-action@v6
        with:
          build: npm run build
          start: npx vite --host

```
Adjust the branch name in the on section to the branch you want to test (e.g., 'develop').

### Viewing Test Results
1. Push the changes to GitHub.
2. Navigate to the "Actions" tab in your repository.
![image](https://github.com/domits1/Domits/assets/54837793/77b51d99-6689-4702-ad10-a4baf7d347ed)
3. Click on the specific workflow run to view details.
![image](https://github.com/domits1/Domits/assets/54837793/78ba2028-e460-4182-8fb2-728fc90d0b7d)
4. Check the overall status and click on the "Cypress Tests" job to see individual test results.
![image](https://github.com/domits1/Domits/assets/54837793/1b2feaf3-4816-4a93-8a65-2868f23dfbab)

### Troubleshooting
If a test fails, review the logs for detailed information. Adjust the tests to match the features present in the branch being tested.