module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    testTimeout: 20000,
    moduleFileExtensions: ['ts', 'js'],
    preset: 'ts-jest',
    testMatch: ['**/tests/**/*.spec.ts', '**/tests/**/*.spec.js'],
    collectCoverageFrom: [
        'server/**/*.{ts,js}',
        'lib/**/*.{ts,js}',
        'routes/**/*.{ts,js}',
        '!**/*.d.ts',
        '!**/node_modules/**'
    ]
};
