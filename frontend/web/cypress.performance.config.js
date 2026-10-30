const { defineConfig } = require("cypress");

module.exports = defineConfig({
  component: {
    devServer: {
      framework: "create-react-app",
      bundler: "webpack",
    },
    specPattern: "src/features/review/tests/cypress/*.cy.jsx",
    supportFile: false,
  },
});
