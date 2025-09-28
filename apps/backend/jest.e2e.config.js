module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/e2e/**/*.test.ts'],
  setupFiles: ['dotenv/config'],
  reporters: ['default'],
  verbose: true
};
