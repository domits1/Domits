module.exports = {
  projectId: 'ooqckv',
  e2e: {
    setupNodeEvents(on, config) {

    },
    specPattern: ["src/tests/cypress/**/*.cy.js", "src/features/review/tests/cypress/e2e/*.cy.js"],
    supportFile: false, 
  },
};
