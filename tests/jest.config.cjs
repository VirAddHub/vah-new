module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    testTimeout: 20000,
    moduleFileExtensions: ['ts', 'js'],
    preset: 'ts-jest'
};