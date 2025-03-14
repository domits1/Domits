const { defineConfig } = require("cypress");

module.exports = defineConfig({
  projectId: "m9poow",
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
