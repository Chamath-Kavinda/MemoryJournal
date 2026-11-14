export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', 'test', 'refactor', 'chore', 'build', 'ci']],
    'header-max-length': [2, 'always', 72],
    'subject-case': [0],
  },
};
