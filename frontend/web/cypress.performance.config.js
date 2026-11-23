const { defineConfig } = require("cypress");

module.exports = defineConfig({
  component: {
    devServer: {
      // Cypress 14+ no longer has a "create-react-app" preset: use React with CRA's own webpack config.
      framework: "react",
      bundler: "webpack",
      webpackConfig: () => {
        process.env.NODE_ENV = process.env.NODE_ENV || "development";
        process.env.BABEL_ENV = process.env.BABEL_ENV || "development";
        const config = require("react-scripts/config/webpack.config")("development");
        // Like Cypress's former CRA preset: drop React Fast Refresh (breaks modules loaded by Cypress) and the
        // ESLint plugin (the specs use Cypress globals such as `cy` that CRA's lint config does not know).
        config.plugins = config.plugins.filter(
          (p) => !["ReactRefreshPlugin", "ESLintWebpackPlugin"].includes(p.constructor.name)
        );
        config.module.rules.forEach((rule) =>
          (rule.oneOf || []).forEach((r) => {
            if (r.options && Array.isArray(r.options.plugins)) {
              r.options.plugins = r.options.plugins.filter((x) => !String(x).includes("react-refresh"));
            }
          })
        );
        return config;
      },
    },
    specPattern: "src/features/review/tests/cypress/*.cy.jsx",
    supportFile: false,
  },
});
