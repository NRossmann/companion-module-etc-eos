module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
	transform: {
		'^.+\\.tsx?$': 'ts-jest',
	},
	testMatch: ['**/*.test.ts', '**/*.test.js'],
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
}
