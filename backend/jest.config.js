module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    testPathIgnorePatterns: [
        '\\.integration\\.spec\\.ts$',
    ],
    transform: {
        '^.+\\.(t|j)s$': [
            'ts-jest',
            {
                tsconfig: {
                    skipLibCheck: true,
                    forceConsistentCasingInFileNames: true,
                    types: ['jest', 'node'],
                },
            },
        ],
    },
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
};