module.exports = {
  preset: 'react-native',
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!react-native-vector-icons|some-other-es-module)/',
  ],
  setupFilesAfterEnv: ['./src/features/translation/tests/jest.setup.js'],
};
