module.exports = {
  root: true,
  env: { browser: true, es2023: true, node: true },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  ignorePatterns: ['node_modules', 'dist'],
  rules: {
    // example custom rule:
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
}
