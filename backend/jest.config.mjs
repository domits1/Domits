export default {
    transform: {
        '^.+\\.(js|mjs)$': 'babel-jest',
    },
    testEnvironment: 'node',
    moduleNameMapper: {
      '^\\.\\./\\.shared/(.*)$': '<rootDir>/functions/.shared/$1',
      '^\\.\\./\\.\\./\\.shared/(.*)$': '<rootDir>/functions/.shared/$1',
      '^\\.\\./\\.\\./\\.\\./\\.shared/(.*)$': '<rootDir>/functions/.shared/$1'
    },
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
