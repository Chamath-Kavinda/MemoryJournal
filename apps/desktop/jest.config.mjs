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
};
