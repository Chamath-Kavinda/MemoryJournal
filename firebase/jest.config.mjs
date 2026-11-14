/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/*.test.ts'],
  testTimeout: 30_000,
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
