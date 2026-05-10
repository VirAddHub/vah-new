module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.server.json' }],
    },
    testTimeout: 20000,
    moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
    // Resolve modules through local node_modules first, then workspace root.
    // Required because ts-jest is hoisted to ../../node_modules in npm workspaces.
    moduleDirectories: ['node_modules', '../../node_modules'],
    testMatch: ['**/tests/**/*.spec.ts', '**/tests/**/*.spec.js', '**/src/services/**/*.test.ts'],
    collectCoverageFrom: [
        'src/**/*.{ts,js}',
        'server/**/*.{ts,js}',
        'lib/**/*.{ts,js}',
        'routes/**/*.{ts,js}',
        '!**/*.d.ts',
        '!**/node_modules/**'
    ]
};
