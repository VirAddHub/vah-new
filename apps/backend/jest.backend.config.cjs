module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.server.json' }],
    },
    testTimeout: 20000,
    moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
    testMatch: ['**/tests/**/*.spec.ts', '**/tests/**/*.spec.js'],
    collectCoverageFrom: [
        'src/**/*.{ts,js}',
        'server/**/*.{ts,js}',
        'lib/**/*.{ts,js}',
        'routes/**/*.{ts,js}',
        '!**/*.d.ts',
        '!**/node_modules/**'
    ]
};
