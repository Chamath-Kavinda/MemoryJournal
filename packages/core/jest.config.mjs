/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: { target: 'es2022', parser: { syntax: 'typescript' } },
        module: { type: 'commonjs' },
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/index.ts', '!src/types.ts'],
  coverageProvider: 'v8',
  coverageThreshold: {
    global: { statements: 90, branches: 90, functions: 90, lines: 90 },
  },
};
