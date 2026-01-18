/* eslint-disable */
export default {
  displayName: 'modules-clients',
  preset: '../../../jest.preset.js',
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
  coverageDirectory: '../../../coverage/libs/modules/clients',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
  ],
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
  ],
  moduleNameMapper: {
    '^@accounting/(.*)$': '<rootDir>/../../../libs/$1/src/index.ts',
  },
};
