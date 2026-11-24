export default {
    transform: {
        '^.+\\.(js|mjs)$': 'babel-jest',
    },
    testEnvironment: 'node',
    moduleNameMapper: {
      '^database/models/(.*)
      '^\\./\\.shared/(.*)$': '<rootDir>/functions/.shared/$1',
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
: '<rootDir>/ORM/models/$1.js',
      '^database/money
      '^\\./\\.shared/(.*)$': '<rootDir>/functions/.shared/$1',
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
: '<rootDir>/ORM/money/currencyAmount.js',
      '^\\./\\.shared/(.*)$': '<rootDir>/functions/.shared/$1',
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
