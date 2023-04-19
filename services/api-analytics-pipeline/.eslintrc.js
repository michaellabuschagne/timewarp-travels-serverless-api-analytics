module.exports = {
  parser: "@babel/eslint-parser",
  env: {
    es6: true,
    node: true,
    browser: true
  },
  rules: {
    "no-console": "off",
    "no-only-tests/no-only-tests": "error"
  },
  parserOptions: {
    ecmaVersion: 6,
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: ["jest", "no-only-tests"],
  extends: ["eslint:recommended", "plugin:prettier/recommended"],
  globals: {
    it: true,
    expect: true,
    test: true,
    beforeEach: true,
    before: true,
    afterEach: true,
    after: true,
    describe: true,
    _: true
  },
  overrides: [
    {
      files: "server/**/*.js",
      env: { node: true },
      rules: {
        "import/order": ["error", { "newlines-between": "always" }]
      }
    }
  ],
  ignorePatterns: ["node_modules/"],
  settings: {}
};
