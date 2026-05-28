module.exports = {
    testEnvironment: "jsdom",
    testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js?(x)", "**/?(*.)+(spec|test).jsx"],
    transform: {
        "^.+\\.[jt]sx?$": "babel-jest",
        "^.+\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "^.+\\.(jpg|jpeg|png|gif|webp|svg)$": "jest-transform-stub"
    },
    transformIgnorePatterns: [
        "node_modules/(?!(axios)/)"
    ],
    moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "\\.json$": "<rootDir>/__mocks__/fileMock.js",
    },
};
