module.exports = {
  projectId: 'ooqckv',
  e2e: {
    supportFile: 'src/tests/cypress/support/e2e.js',      // 👈 tell Cypress where it is
    specPattern: 'src/tests/cypress/**/*.cy.js',
    setupNodeEvents(on, config) {
      // Implement node event listeners here
    },
  },
};
