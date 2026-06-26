module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: '.',
    testEnvironment: 'node',
    testRegex: '.e2e-spec.ts$',
    setupFilesAfterEnv: ['./jest-e2e-setup.ts'],
    transform: {
        '^.+\\.(t|j)s$': [
            'ts-jest',
            {
                tsconfig: {
                    skipLibCheck: true,
                    forceConsistentCasingInFileNames: true,
                    moduleResolution: 'bundler',
                    types: ['jest', 'node'],
                },
            },
        ],
    },
};
