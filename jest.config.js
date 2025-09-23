module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.spec.js', '**/tests/**/*.test.js'],
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.cjs'],
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|undici)/)'
  ],
  moduleNameMapper: {
    '^node-fetch$': '<rootDir>/__mocks__/node-fetch.js'
  }
};
