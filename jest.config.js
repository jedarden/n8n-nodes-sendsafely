module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>'],
	testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	collectCoverageFrom: [
		'credentials/**/*.ts',
		'nodes/**/*.ts',
		'!**/*.test.ts',
		'!**/__tests__/**',
		'!**/node_modules/**',
		'!**/dist/**',
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'lcov', 'html'],
	moduleFileExtensions: ['ts', 'js', 'json'],
	globals: {
		'ts-jest': {
			tsconfig: {
				esModuleInterop: true,
			},
		},
	},
};
