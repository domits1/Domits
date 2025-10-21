module.exports = {
  projectId: 'ooqckv',
  e2e: {
    setupNodeEvents(on, config) {
      // Implement node event listeners here
    },
    specPattern: "src/tests/cypress/e2e/GuestBookingEngine.cy.js" // Corrected to match your new path
  },
};