module.exports = {
    testEnvironment: "jsdom",
    testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
    transform: {
        "^.+\\.js$": "babel-jest",
        "^.+\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "^.+\\.(jpg|jpeg|png|gif|webp|svg)$": "jest-transform-stub"
    },
    transformIgnorePatterns: [
        "node_modules/(?!(axios)/)"
    ],
    setupFiles: ["<rootDir>/src/jestPolyfills.js"],
    setupFilesAfterEnv: ["<rootDir>/src/tests/setupTests.js"],
    moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    },
};
