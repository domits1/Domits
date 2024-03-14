module.exports = {
    testEnvironment: "jsdom",
    testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
    transform: {
        "^.+\\.[t|j]sx?$": "babel-jest",
    },
};