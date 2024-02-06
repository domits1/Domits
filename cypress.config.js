const { defineConfig } = require("cypress");

module.exports = defineConfig({
  // Specify where your Cypress tests are located
  integrationFolder: 'cypress/e2e',

  // Specify the base URL of your application
  baseUrl: 'http://localhost:3000',

  // Configure Cypress to work with webpack dev server for React
  devServer: {
    command: 'npm run start', // Command to start your React development server
    port: 3000, // Port where your application runs
    waitForServerMs: 5000, // Time to wait for the server to start before failing tests
    // Other options if needed
  },
});
