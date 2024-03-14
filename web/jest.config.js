module.exports = {
    testEnvironment: "jsdom",
    testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
    transform: {
        "node_modules/(?!(axios|@aws-amplify)/)",
    },
};

