module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.spec.js', '**/tests/**/*.test.js'],
  verbose: true,
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch)/)'
  ],
  moduleNameMapper: {
    '^node-fetch$': 'node-fetch'
  }
};
