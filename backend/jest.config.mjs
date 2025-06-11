export default {
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    testEnvironment: 'node',
    testMatch: [
      "**/**/**.test.js",
      "**/**/**.test.mjs"
    ],
    moduleFileExtensions: [
        'js',
        'mjs',
    ],
    testTimeout: 10000
};
