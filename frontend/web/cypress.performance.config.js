const { defineConfig } = require("cypress");

module.exports = defineConfig({
  component: {
    devServer: {
      framework: "create-react-app",
      bundler: "webpack",
    },
    specPattern: "cypress/component/{ReviewPerformance,DecliningPropertyRatings}.cy.jsx",
    supportFile: false,
  },
});
