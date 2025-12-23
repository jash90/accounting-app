/* eslint-disable */
export default {
  displayName: 'api',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
  collectCoverageFrom: [
    'src/**/*.ts',
    '../../libs/**/*.ts',
    '!src/**/*.spec.ts',
    '!**/*.spec.ts',
    '!src/**/*.d.ts',
    '!**/*.d.ts',
    '!src/main.ts',
    '!src/migrations/**',
    '!src/seeders/**',
  ],
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/../../libs/**/*.spec.ts',
  ],
  moduleNameMapper: {
    '^@accounting/(.*)$': '<rootDir>/../../libs/$1/src/index.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
};
