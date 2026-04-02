import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@domain/(.*)$':          '<rootDir>/src/domain/$1',
    '^@application/(.*)$':    '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@presentation/(.*)$':   '<rootDir>/src/presentation/$1',
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  setupFiles: ['<rootDir>/tests/setup.ts'],
};

export default config;